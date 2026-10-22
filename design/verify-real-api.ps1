param(
  [string]$BaseUrl = 'http://127.0.0.1:18080/api/v1',
  [string]$SecretFile = 'output/runtime/redesign-qa/.env',
  [string]$ReportFile = 'output/runtime/redesign-qa/api-result.json'
)

# Writes test fixtures. Run only against the isolated redesign QA database.
$ErrorActionPreference = 'Stop'
if ($BaseUrl -notin @('http://127.0.0.1:18080/api/v1', 'http://127.0.0.1:18081/api/v1')) {
  throw 'This verifier is restricted to isolated QA backends on ports 18080/18081.'
}
$secrets = @{}
foreach ($line in Get-Content -LiteralPath $SecretFile) {
  if ($line -match '^([A-Z_]+)=(.*)$') { $secrets[$matches[1]] = $matches[2] }
}
$checks = [Collections.Generic.List[string]]::new()
function Check($condition, [string]$label) {
  if (-not $condition) { throw "Assertion failed: $label" }
  $checks.Add($label)
}
function Guest {
  $who = @{ Session = [Microsoft.PowerShell.Commands.WebRequestSession]::new(); Role = ''; Csrf = '' }
  $who.Csrf = (Invoke-RestMethod "$BaseUrl/auth/csrf" -WebSession $who.Session).data.csrfToken
  return $who
}
function Call($who, [string]$method, [string]$path, $body = $null, [string]$key = '', [int]$expected = 200, [string]$expectedCode = '', [switch]$NoCsrf, [string]$PortalOverride = '') {
  # Invoke-WebRequest retains request headers in WebRequestSession; clear per-request values.
  $null = $who.Session.Headers.Remove('X-XSRF-TOKEN')
  $null = $who.Session.Headers.Remove('X-Portal-Role')
  $null = $who.Session.Headers.Remove('Idempotency-Key')
  $headers = @{}
  if ($who.Role) { $headers['X-Portal-Role'] = $who.Role }
  if ($PortalOverride) { $headers['X-Portal-Role'] = $PortalOverride }
  if (-not $NoCsrf -and $method -ne 'GET') { $headers['X-XSRF-TOKEN'] = $who.Csrf }
  if ($key) { $headers['Idempotency-Key'] = $key }
  $params = @{ Uri = "$BaseUrl$path"; Method = $method; Headers = $headers; WebSession = $who.Session; SkipHttpErrorCheck = $true }
  if ($method -ne 'GET') {
    $params.ContentType = 'application/json'
    $params.Body = if ($null -eq $body) { '{}' } else { $body | ConvertTo-Json -Depth 10 -Compress }
  }
  $response = Invoke-WebRequest @params
  $json = $response.Content | ConvertFrom-Json
  if ([int]$response.StatusCode -ne $expected) {
    throw "$method $path returned $($response.StatusCode) / $($json.code), expected $expected"
  }
  if ($expectedCode -and $json.code -ne $expectedCode) {
    throw "$method $path returned code $($json.code), expected $expectedCode"
  }
  return $json.data
}
function Login([string]$username, [string]$password, [string]$role) {
  $who = Guest
  $login = Call $who POST '/auth/login' @{ username = $username; password = $password; portalRole = $role }
  $who.Role = $role
  $who.User = $login.user
  $who.Csrf = (Invoke-RestMethod "$BaseUrl/auth/csrf" -WebSession $who.Session).data.csrfToken
  return $who
}
function Key { return [guid]::NewGuid().ToString() }

$suffix = [guid]::NewGuid().ToString('N').Substring(0, 8)
$password = [guid]::NewGuid().ToString('N') + '!Aa9'
$guest = Guest
$admin = Login 'demo_admin' $secrets.DEMO_ADMIN_PASSWORD ADMIN
$librarian = Login 'demo_librarian' $secrets.DEMO_LIBRARIAN_PASSWORD LIBRARIAN
$overdueReader = Login 'demo_reader' $secrets.DEMO_READER_PASSWORD READER
Check ($admin.User.role -eq 'ADMIN' -and $librarian.User.role -eq 'LIBRARIAN' -and $overdueReader.User.role -eq 'READER') 'Three portal roles authenticate with independent sessions'
$null = Call $guest POST '/auth/login' @{ username = 'demo_admin'; password = $secrets.DEMO_ADMIN_PASSWORD; portalRole = 'READER' } '' 401 'INVALID_CREDENTIALS'
Check $true 'A valid staff password cannot log into the reader portal'
$readerNames = @("qa_a_$suffix", "qa_b_$suffix")
$readers = @()
foreach ($name in $readerNames) {
  $registered = Call $guest POST '/auth/register' @{ username = $name; password = $password; displayName = '联调读者' } '' 201
  Check ($registered.userId -is [string]) 'Registration returns a string ID'
  $readers += Login $name $password READER
}
$readerA = $readers[0]; $readerB = $readers[1]
$profile = Call $readerA PATCH '/me/profile' @{ displayName = '联调读者甲'; phone = '13800138000' }
Check ($profile.displayName -eq '联调读者甲' -and $profile.phone -eq '13800138000') 'Profile changes persist in the real database'
$me = Call $readerA GET '/auth/me'
Check ($me.id -eq $readerA.User.id -and $me.displayName -eq $profile.displayName) 'Session restoration returns updated profile data'
$policy = Call $guest GET '/policy'
$publicBooks = Call $guest GET '/books?page=1&size=20'
$categories = Call $guest GET '/categories'
Check ($policy.maxActiveLoans -eq 5 -and $policy.renewalDays -eq 15 -and $policy.timeZone -eq 'Asia/Shanghai') 'Public borrowing policy matches the frontend contract'
Check ($publicBooks.items.Count -ge 20 -and $categories.Count -ge 5) 'Public catalog and categories return seeded MySQL data'
$null = Call $readerA GET '/users' $null '' 403
$null = Call $librarian GET '/users' $null '' 403
$null = Call $librarian GET '/audit-logs' $null '' 403
$null = Call $readerA GET '/copies/lookup?barcode=does-not-exist' $null '' 403
$null = Call $librarian GET '/me/loans' $null '' 403
$null = Call $readerA GET '/auth/me' $null '' 403 '' -PortalOverride ADMIN
$null = Call $readerA POST '/auth/logout' $null '' 403 '' -NoCsrf
Check $true 'Role boundaries, portal header validation and CSRF rejection hold'

$categoryBody = @{ name = "联调分类$suffix"; code = "QA_$suffix"; enabled = $true; sortOrder = 99 }
$category = Call $librarian POST '/categories' $categoryBody '' 201
$categoryBody.name = "联调分类已编辑$suffix"
$category = Call $librarian PATCH "/categories/$($category.id)" $categoryBody
Check ($category.name -eq $categoryBody.name) 'Librarian can create and edit categories'
$bookBody = @{ isbn = $null; title = "联调书目$suffix"; author = '联调作者'; categoryId = $category.id; enabled = $true; description = '真实数据库联调'; keywords = '接口,验证' }
$book = Call $librarian POST '/books' $bookBody '' 201
$bookBody.publisher = '联调出版社'
$book = Call $librarian PATCH "/books/$($book.id)" $bookBody
$barcode = "QA$suffix"
$copies = Call $librarian POST "/books/$($book.id)/copies" @{ barcodes = @($barcode); shelfLocation = 'QA-1' } '' 201
Check ($book.id -is [string] -and $book.publisher -eq '联调出版社' -and $copies.Count -eq 1) 'Catalog editing and copy creation persist with string IDs'
$copy = $copies[0]
$updatedCopy = Call $librarian PATCH "/copies/$($copy.id)" @{ shelfLocation = 'QA-2'; version = $copy.version }
$null = Call $librarian PATCH "/copies/$($copy.id)" @{ shelfLocation = 'stale'; version = $copy.version } '' 409
Check ($updatedCopy.shelfLocation -eq 'QA-2' -and $updatedCopy.version -gt $copy.version) 'Copy version conflict rejects stale updates'
$lookup = Call $librarian GET "/readers/lookup?username=$($readerNames[0])"
Check ($lookup.id -eq $readerA.User.id -and $lookup.activeLoanCount -eq 0) 'Exact reader lookup returns live loan counts'

$reserveKey = Key
$ready = Call $readerA POST '/reservations' @{ bookId = $book.id } $reserveKey 201
$replay = Call $readerA POST '/reservations' @{ bookId = $book.id } $reserveKey 201
$waiting = Call $readerB POST '/reservations' @{ bookId = $book.id } (Key) 201
Check ($ready.status -eq 'READY' -and $ready.copyBarcode -eq $barcode -and $ready.pickupDeadline -and $replay.id -eq $ready.id) 'First reservation becomes READY; identical submission replays the same result'
Check ($waiting.status -eq 'WAITING' -and $waiting.queuePosition -eq 1) 'Second reader enters the real waiting queue'
$null = Call $readerA POST '/reservations' @{ bookId = '1' } $reserveKey 409 'IDEMPOTENCY_CONFLICT'
$null = Call $readerB POST "/reservations/$($ready.id)/cancel" @{} (Key) 404
$null = Call $librarian POST '/loans' @{ readerId = $readerB.User.id; copyBarcode = $barcode } (Key) 409
Check $true 'Reservation ownership, queue priority and changed-payload idempotency are enforced'
$checkoutKey = Key
$loan = Call $librarian POST '/loans' @{ readerId = $readerA.User.id; copyBarcode = $barcode } $checkoutKey 201
$loanReplay = Call $librarian POST '/loans' @{ readerId = $readerA.User.id; copyBarcode = $barcode } $checkoutKey 201
$myReservations = Call $readerA GET '/me/reservations?page=1&size=20'
$myLoans = Call $readerA GET '/me/loans?page=1&size=20'
Check ($loan.status -eq 'ACTIVE' -and $loanReplay.id -eq $loan.id -and $myLoans.items.id -contains $loan.id) 'Checkout persists once and appears in the reader loan list'
Check (($myReservations.items | Where-Object id -eq $ready.id).status -eq 'FULFILLED') 'Checkout fulfills the matching pickup reservation'
$null = Call $readerA POST "/loans/$($loan.id)/renew" @{} (Key) 422 'RENEWAL_NOT_ALLOWED'
Check $true 'Renewal is blocked while another reader is waiting'
$returnKey = Key
$returned = Call $librarian POST "/loans/$($loan.id)/return" @{ copyBarcode = $barcode } $returnKey
$returnedAgain = Call $librarian POST "/loans/$($loan.id)/return" @{ copyBarcode = $barcode } $returnKey
$myReservations = Call $readerB GET '/me/reservations?page=1&size=20'
$nextReady = $myReservations.items | Where-Object id -eq $waiting.id
Check ($returned.status -eq 'RETURNED' -and $returned.copyStatus -eq 'READY' -and $returnedAgain.id -eq $loan.id) 'Return persists once and allocates the released copy to the queue'
Check ($nextReady.status -eq 'READY' -and $nextReady.copyBarcode -eq $barcode) 'The next reader sees pickup barcode and deadline after return'
$null = Call $librarian POST "/loans/$($loan.id)/return" @{ copyBarcode = $barcode } (Key) 409 'LOAN_ALREADY_CLOSED'
$null = Call $librarian POST "/reservations/$($waiting.id)/cancel" @{} (Key) 400
$cancelled = Call $librarian POST "/reservations/$($waiting.id)/cancel" @{ reason = '真实联调取消' } (Key)
Check ($cancelled.status -eq 'CANCELLED' -and $cancelled.copyStatus -eq 'AVAILABLE') 'Staff cancellation requires a reason and releases the held copy'
$loan2 = Call $librarian POST '/loans' @{ readerId = $readerB.User.id; copyBarcode = $barcode } (Key) 201
$renewKey = Key
$renewed = Call $readerB POST "/loans/$($loan2.id)/renew" @{} $renewKey
$renewedAgain = Call $readerB POST "/loans/$($loan2.id)/renew" @{} $renewKey
Check ($renewed.renewalCount -eq 1 -and ([datetime]$renewed.dueDate - [datetime]$loan2.dueDate).Days -eq 15 -and $renewedAgain.dueDate -eq $renewed.dueDate) 'Eligible renewal extends the stored due date by 15 days and replays safely'
$null = Call $readerB POST "/loans/$($loan2.id)/renew" @{} (Key) 422 'RENEWAL_NOT_ALLOWED'
$null = Call $librarian POST "/loans/$($loan2.id)/return" @{ copyBarcode = $barcode } (Key)
Check $true 'A second renewal is rejected and the renewed loan can be returned'

$overdueLoans = Call $overdueReader GET '/me/loans?status=ACTIVE&page=1&size=20'
$overdue = $overdueLoans.items | Where-Object overdueDays -gt 0 | Select-Object -First 1
Check ($null -ne $overdue -and -not $overdue.allowedActions.canRenew) 'Seeded overdue loans report overdue days and a disabled renewal action'
$null = Call $overdueReader POST '/reservations' @{ bookId = $book.id } (Key) 422 'OVERDUE_BLOCKED'
$null = Call $librarian POST '/loans' @{ readerId = $overdueReader.User.id; copyBarcode = $barcode } (Key) 422 'OVERDUE_BLOCKED'
$null = Call $librarian POST "/loans/$($overdue.id)/return" @{ copyBarcode = $overdue.copyBarcode } (Key)
$unblocked = Call $librarian GET '/readers/lookup?username=demo_reader'
$postOverdue = Call $overdueReader POST '/reservations' @{ bookId = $book.id } (Key) 201
$null = Call $overdueReader POST "/reservations/$($postOverdue.id)/cancel" @{} (Key)
Check ($unblocked.overdueLoanCount -eq 0 -and $postOverdue.status -eq 'READY') 'Returning all overdue copies removes the block and allows new reservations'

$notice = Call $librarian POST '/notices' @{ title = "联调公告$suffix"; content = '<script>plain text only</script>公告正文' } '' 201
$null = Call $guest GET "/notices/$($notice.id)" $null '' 404
$published = Call $librarian POST "/notices/$($notice.id)/publish"
$publicNotice = Call $guest GET "/notices/$($notice.id)"
$publicNotices = Call $guest GET '/notices?status=PUBLISHED&page=1&size=100'
Check ($published.status -eq 'PUBLISHED' -and $publicNotice.content -eq $notice.content -and $publicNotices.items.id -contains $notice.id) 'Published announcements appear publicly while draft details stay private'
$null = Call $librarian POST "/notices/$($notice.id)/withdraw"
$null = Call $guest GET "/notices/$($notice.id)" $null '' 404
Check $true 'Withdrawn announcements are removed from public access'

$staffName = "qa_staff_$suffix"
$staff = Call $admin POST '/users' @{ username = $staffName; initialPassword = $password; displayName = '联调馆员'; role = 'LIBRARIAN' } '' 201
$staffSession = Login $staffName $password LIBRARIAN
Check ($staffSession.User.mustChangePassword) 'New staff accounts require a password change'
$null = Call $staffSession GET '/stats/overview' $null '' 403 'PASSWORD_CHANGE_REQUIRED'
$changedPassword = [guid]::NewGuid().ToString('N') + '!Aa9'
$null = Call $staffSession POST '/me/change-password' @{ oldPassword = $password; newPassword = $changedPassword }
$null = Call $staffSession GET '/stats/overview'
Check $true 'Changing the initial password unlocks staff business APIs'
$null = Call $admin PATCH "/users/$($admin.User.id)" @{ status = 'DISABLED' } '' 409
$null = Call $admin PATCH "/users/$($staff.id)" @{ status = 'DISABLED' }
$null = Call $staffSession GET '/auth/me' $null '' 403 'ACCOUNT_DISABLED'
$null = Call $admin PATCH "/users/$($staff.id)" @{ status = 'ACTIVE' }
$staffSession = Login $staffName $changedPassword LIBRARIAN
$resetPassword = [guid]::NewGuid().ToString('N') + '!Aa9'
$null = Call $admin POST "/users/$($staff.id)/reset-password" @{ newPassword = $resetPassword }
$null = Call $staffSession GET '/auth/me' $null '' 401
$resetSession = Login $staffName $resetPassword LIBRARIAN
Check ($resetSession.User.mustChangePassword) 'Self-disable is rejected; disable and password reset invalidate prior sessions'

$imagePath = Join-Path ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($ReportFile))) "qa-cover-$suffix.png"
[IO.File]::WriteAllBytes($imagePath, [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg=='))
try {
  $cover = Invoke-RestMethod "$BaseUrl/media/covers" -Method Post -Headers @{ 'X-XSRF-TOKEN' = $librarian.Csrf; 'X-Portal-Role' = 'LIBRARIAN' } -Form @{ file = Get-Item -LiteralPath $imagePath } -WebSession $librarian.Session
  $image = Invoke-WebRequest (([uri]$BaseUrl).GetLeftPart([UriPartial]::Authority) + $cover.data.coverPath)
  Check ($cover.data.coverPath -match '^/api/v1/media/covers/[a-f0-9]{32}\.png$' -and $image.Headers['Content-Type'] -match 'image/png') 'Cover upload returns an opaque path and a readable image'
} finally { Remove-Item -LiteralPath $imagePath -ErrorAction SilentlyContinue }
$overview = Call $admin GET '/stats/overview'
$trend = Call $librarian GET '/stats/loans-trend?days=30'
$top = Call $librarian GET '/stats/top-books?days=30&limit=10'
$audit = Call $admin GET '/audit-logs?page=1&size=100'
# Seed data contains one RETIRED copy, excluded from totalCopies by contract.
Check ($overview.bookCount -ge 21 -and $overview.totalCopies -ge 20 -and $overview.generatedAt -and $trend.Count -eq 30) 'Statistics report real catalog totals and 30 dated trend points'
Check ($top.bookId -contains $book.id -and $audit.items.action -contains 'LOAN_RETURNED') 'Popular-book ranking and audit logs reflect the tested transactions'
$null = Call $readerA POST '/auth/logout'
$null = Call $readerA GET '/auth/me' $null '' 401
Check $true 'Logout prevents subsequent access to the previous private session'

$report = [ordered]@{ result = 'PASS'; checkedAt = [DateTimeOffset]::Now.ToString('o'); baseUrl = $BaseUrl; database = 'Isolated MySQL 8.4'; checkCount = $checks.Count; checks = $checks; fixtureSuffix = $suffix; existingDatabaseModified = $false }
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ReportFile -Encoding utf8
[pscustomobject]@{ result = 'PASS'; checkCount = $checks.Count; report = $ReportFile } | ConvertTo-Json -Compress
