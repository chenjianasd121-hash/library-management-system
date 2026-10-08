param([string]$BaseUrl = 'http://localhost:8080/api/v1')

$ErrorActionPreference = 'Stop'
if (-not $env:DEMO_ADMIN_PASSWORD -or -not $env:DEMO_READER_PASSWORD) {
  throw 'Set DEMO_ADMIN_PASSWORD and DEMO_READER_PASSWORD in the process environment.'
}

function Assert($condition, [string]$message) { if (-not $condition) { throw $message } }
function New-Session([string]$username, [string]$password, [string]$portalRole) {
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $csrf = (Invoke-RestMethod "$BaseUrl/auth/csrf" -WebSession $session).data.csrfToken
  $body = @{ username = $username; password = $password; portalRole = $portalRole } | ConvertTo-Json -Compress
  $login = Invoke-RestMethod "$BaseUrl/auth/login" -Method Post -ContentType 'application/json' -Headers @{ 'X-XSRF-TOKEN' = $csrf } -Body $body -WebSession $session
  $csrf = (Invoke-RestMethod "$BaseUrl/auth/csrf" -WebSession $session).data.csrfToken
  return @{ Session = $session; Csrf = $csrf; User = $login.data.user }
}
function Post($who, [string]$path, $body, [string]$key = '') {
  $headers = @{ 'X-XSRF-TOKEN' = $who.Csrf }
  if ($key) { $headers['Idempotency-Key'] = $key }
  return Invoke-RestMethod "$BaseUrl$path" -Method Post -ContentType 'application/json' -Headers $headers -Body ($body | ConvertTo-Json -Compress -Depth 8) -WebSession $who.Session
}

$suffix = [guid]::NewGuid().ToString('N').Substring(0, 8)
$guest = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$guestCsrf = (Invoke-RestMethod "$BaseUrl/auth/csrf" -WebSession $guest).data.csrfToken
$registerBody = @{ username = "smoke_$suffix"; password = $env:DEMO_READER_PASSWORD; displayName = '联调读者' } | ConvertTo-Json -Compress
$registered = Invoke-RestMethod "$BaseUrl/auth/register" -Method Post -ContentType 'application/json' -Headers @{ 'X-XSRF-TOKEN' = $guestCsrf } -Body $registerBody -WebSession $guest
Assert ($registered.data.userId -match '^[0-9]+$') 'Registration did not return a string ID.'
$reader = New-Session "smoke_$suffix" $env:DEMO_READER_PASSWORD 'READER'
$admin = New-Session 'demo_admin' $env:DEMO_ADMIN_PASSWORD 'ADMIN'
Assert ($reader.User.role -eq 'READER' -and $admin.User.role -eq 'ADMIN') 'Login roles are incorrect.'

$bookBody = @{ isbn = $null; title = "联调图书 $suffix"; author = '联调作者'; publisher = $null; publishedOn = $null; description = '真实数据库联调'; categoryId = '1'; keywords = '联调,测试'; coverPath = $null; enabled = $true } | ConvertTo-Json -Compress
$book = Invoke-RestMethod "$BaseUrl/books" -Method Post -ContentType 'application/json' -Headers @{ 'X-XSRF-TOKEN' = $admin.Csrf } -Body $bookBody -WebSession $admin.Session
$barcode = "SMOKE$suffix"
$copies = Post $admin "/books/$($book.data.id)/copies" @{ barcodes = @($barcode); shelfLocation = 'S-1' }
Assert ($copies.data.Count -eq 1) 'Copy creation failed.'

$imagePath = Join-Path $env:TEMP "library-cover-$suffix.png"
[IO.File]::WriteAllBytes($imagePath, [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg=='))
try {
  $cover = Invoke-RestMethod "$BaseUrl/media/covers" -Method Post -Headers @{ 'X-XSRF-TOKEN' = $admin.Csrf } -Form @{ file = Get-Item -LiteralPath $imagePath } -WebSession $admin.Session
  Assert ($cover.data.coverPath -match '^/api/v1/media/covers/[0-9a-f]{32}\.png$') 'Cover path was not opaque.'
  $coverResponse = Invoke-WebRequest ("http://localhost:8080" + $cover.data.coverPath) -WebSession $admin.Session
  Assert ($coverResponse.StatusCode -eq 200 -and $coverResponse.Headers['Content-Type'] -match 'image/png') 'Stored cover was not readable.'
} finally { Remove-Item -LiteralPath $imagePath -ErrorAction SilentlyContinue }
$largeImagePath = Join-Path $env:TEMP "library-large-cover-$suffix.png"
[IO.File]::WriteAllBytes($largeImagePath, (New-Object byte[] (2 * 1024 * 1024 + 1)))
try {
  $largeRejected = $false
  try { $null = Invoke-RestMethod "$BaseUrl/media/covers" -Method Post -Headers @{ 'X-XSRF-TOKEN' = $admin.Csrf } -Form @{ file = Get-Item -LiteralPath $largeImagePath } -WebSession $admin.Session }
  catch { $largeRejected = $_.Exception.Response.StatusCode -eq 400 }
  Assert $largeRejected 'Oversized cover was not rejected with HTTP 400.'
} finally { Remove-Item -LiteralPath $largeImagePath -ErrorAction SilentlyContinue }

$reserveKey = [guid]::NewGuid().ToString()
$reservation = Post $reader '/reservations' @{ bookId = $book.data.id } $reserveKey
Assert ($reservation.data.status -eq 'READY') 'Available copy was not assigned to the first reservation.'
$reservationRetry = Post $reader '/reservations' @{ bookId = $book.data.id } $reserveKey
Assert ($reservationRetry.data.id -eq $reservation.data.id) 'Idempotent reservation replay changed the result.'

$checkoutKey = [guid]::NewGuid().ToString()
$loan = Post $admin '/loans' @{ readerId = $reader.User.id; copyBarcode = $barcode } $checkoutKey
Assert ($loan.data.status -eq 'ACTIVE') 'Checkout failed.'
$loanRetry = Post $admin '/loans' @{ readerId = $reader.User.id; copyBarcode = $barcode } $checkoutKey
Assert ($loanRetry.data.id -eq $loan.data.id) 'Idempotent checkout replay changed the result.'
$myLoans = Invoke-RestMethod "$BaseUrl/me/loans?page=1&size=20" -WebSession $reader.Session
Assert ($myLoans.data.items.id -contains $loan.data.id) 'Reader cannot see own loan.'

$renew = Post $reader "/loans/$($loan.data.id)/renew" @{} ([guid]::NewGuid().ToString())
Assert ($renew.data.renewalCount -eq 1) 'Renewal did not persist.'
$returnKey = [guid]::NewGuid().ToString()
$returned = Post $admin "/loans/$($loan.data.id)/return" @{ copyBarcode = $barcode } $returnKey
Assert ($returned.data.status -eq 'RETURNED' -and $returned.data.copyStatus -eq 'AVAILABLE') 'Return did not release the copy.'
$returnRetry = Post $admin "/loans/$($loan.data.id)/return" @{ copyBarcode = $barcode } $returnKey
Assert ($returnRetry.data.id -eq $loan.data.id) 'Idempotent return replay changed the result.'
$stats = Invoke-RestMethod "$BaseUrl/stats/overview" -WebSession $admin.Session
Assert ($stats.data.bookCount -ge 21 -and $stats.data.totalCopies -ge 20) 'Statistics did not reflect database changes.'

$forbidden = $false
try { $null = Invoke-RestMethod "$BaseUrl/users" -WebSession $reader.Session } catch { $forbidden = $_.Exception.Response.StatusCode -eq 403 }
Assert $forbidden 'Reader could access administrator users.'
$reader.Session.Headers.Remove('X-XSRF-TOKEN') | Out-Null
$missingCsrf = $false
try { $null = Invoke-RestMethod "$BaseUrl/auth/logout" -Method Post -WebSession $reader.Session } catch { $missingCsrf = $_.Exception.Response.StatusCode -eq 403 }
Assert $missingCsrf 'Logout without CSRF was accepted.'

[pscustomobject]@{ result = 'PASS'; database = 'MySQL 8.4'; registeredUserId = $registered.data.userId; bookId = $book.data.id; copyId = $copies.data[0].id; reservationId = $reservation.data.id; loanId = $loan.data.id; finalCopyStatus = $returned.data.copyStatus; bookCount = $stats.data.bookCount } | ConvertTo-Json -Compress
