param(
  [Parameter(Mandatory = $true)][ValidateLength(8, 48)][string]$TestPassword,
  [string]$BaseUrl = 'http://127.0.0.1:8080/api/v1',
  [string]$OutputDirectory = 'output/runtime/local-test-seed'
)

# Local development fixtures only. Does not reset existing accounts or business data.
$ErrorActionPreference = 'Stop'
if ($BaseUrl -ne 'http://127.0.0.1:8080/api/v1') { throw 'Only the local backend on port 8080 is supported.' }
$taskOutput = [IO.Path]::GetFullPath($OutputDirectory)
$taskWorkspaceOutput = [IO.Path]::GetFullPath((Join-Path (Get-Location) 'output')) + [IO.Path]::DirectorySeparatorChar
if (-not $taskOutput.StartsWith($taskWorkspaceOutput, [StringComparison]::OrdinalIgnoreCase)) { throw 'Reports must stay within the ignored workspace output directory.' }
New-Item -ItemType Directory -Path $taskOutput -Force | Out-Null
$taskCheckpointPath = Join-Path $taskOutput 'checkpoint.json'
if (Test-Path -LiteralPath $taskCheckpointPath) { throw 'A fixture checkpoint already exists. Inspect and resume it; do not seed duplicate records.' }
$script:state = [ordered]@{
  batch = 'LOCAL_TEST_20261022'; startedAt = [DateTimeOffset]::Now.ToString('o'); phase = 'preflight';
  originalDataReset = $false; accounts = @(); categories = @(); books = @(); loans = @(); reservations = @(); notices = @()
}
function Save-Checkpoint([string]$phase) {
  $script:state.phase = $phase
  $script:state | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $taskCheckpointPath -Encoding utf8
}
function Guest {
  $who = @{ Session = [Microsoft.PowerShell.Commands.WebRequestSession]::new(); Role = ''; Csrf = '' }
  $who.Csrf = (Invoke-RestMethod "$BaseUrl/auth/csrf" -WebSession $who.Session -TimeoutSec 15).data.csrfToken
  return $who
}
function Call($who, [string]$method, [string]$path, $body = $null, [string]$key = '', [int]$expected = 200) {
  foreach ($header in @('X-XSRF-TOKEN', 'X-Portal-Role', 'Idempotency-Key')) { $null = $who.Session.Headers.Remove($header) }
  $headers = @{}
  if ($who.Role) { $headers['X-Portal-Role'] = $who.Role }
  if ($method -ne 'GET') { $headers['X-XSRF-TOKEN'] = $who.Csrf }
  if ($key) { $headers['Idempotency-Key'] = $key }
  $request = @{ Uri = "$BaseUrl$path"; Method = $method; WebSession = $who.Session; Headers = $headers; SkipHttpErrorCheck = $true; TimeoutSec = 20 }
  if ($method -ne 'GET') {
    $request.ContentType = 'application/json'
    $request.Body = if ($null -eq $body) { '{}' } else { $body | ConvertTo-Json -Depth 8 -Compress }
  }
  $response = Invoke-WebRequest @request
  $json = $response.Content | ConvertFrom-Json
  if ([int]$response.StatusCode -ne $expected) { throw "$method $path returned $($response.StatusCode) / $($json.code): $($json.message)" }
  return $json.data
}
function Login([string]$username, [string]$password, [string]$role) {
  $who = Guest
  $data = Call $who POST '/auth/login' @{ username = $username; password = $password; portalRole = $role }
  $who.Role = $role
  $who.User = $data.user
  $who.Csrf = (Invoke-RestMethod "$BaseUrl/auth/csrf" -WebSession $who.Session -TimeoutSec 15).data.csrfToken
  return $who
}
function Key { return [guid]::NewGuid().ToString() }
function Sql([string]$statement) {
  # Database credentials stay inside the existing container; never echo them.
  $result = $statement | & docker exec -i backend-mysql-1 sh -c 'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql --default-character-set=utf8mb4 -u "$MYSQL_USER" "$MYSQL_DATABASE" --batch --skip-column-names'
  if ($LASTEXITCODE -ne 0) { throw 'Local fixture SQL failed.' }
  return $result
}
function Register($guest, [string]$username, [string]$password, [string]$displayName, [string]$role = 'READER') {
  $created = Call $guest POST '/auth/register' @{ username = $username; password = $password; displayName = $displayName } '' 201
  if ($created.userId -notmatch '^\d+$') { throw 'Expected a string user ID.' }
  $script:state.accounts += @{ id = $created.userId; username = $username; displayName = $displayName; role = $role }
  Save-Checkpoint 'accounts-in-progress'
  return $created.userId
}
function Checkout($reader, $book, [int]$copyIndex = 0) {
  $loan = Call $script:librarian POST '/loans' @{ readerId = $reader.User.id; copyBarcode = $book.copies[$copyIndex].barcode } (Key) 201
  $script:state.loans += $loan
  Save-Checkpoint 'business-records-in-progress'
  return $loan
}
function Reserve($reader, $book) {
  $reservation = Call $reader POST '/reservations' @{ bookId = $book.id } (Key) 201
  $script:state.reservations += $reservation
  Save-Checkpoint 'business-records-in-progress'
  return $reservation
}

$existing = Sql "SELECT COUNT(*) FROM users WHERE username IN ('test_admin_1022','test_librarian_1022','test_reader1_1022','test_reader2_1022','test_overdue_1022');"
if ([string]$existing -ne '0') { throw 'Reserved fixture usernames already exist. Existing accounts were not changed.' }
$guest = Guest
Save-Checkpoint 'preflight-complete'
$initialPassword = [guid]::NewGuid().ToString('N') + '!Aa9'
@{ initialPassword = $initialPassword; password = $TestPassword } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskOutput 'accounts.private.json') -Encoding utf8
$adminId = Register $guest 'test_admin_1022' $initialPassword '测试管理员' 'ADMIN'
# Bootstrap only the exact row just registered. Existing administrator credentials are unknown.
$changed = Sql "UPDATE users SET role='ADMIN',must_change_password=TRUE,session_version=session_version+1 WHERE id=$adminId AND username='test_admin_1022' AND role='READER'; SELECT ROW_COUNT();"
if ([string]$changed -ne '1') { throw 'Expected exactly one newly registered bootstrap account.' }
$admin = Login 'test_admin_1022' $initialPassword ADMIN
$null = Call $admin POST '/me/change-password' @{ oldPassword = $initialPassword; newPassword = $TestPassword }
$staff = Call $admin POST '/users' @{ username = 'test_librarian_1022'; initialPassword = $initialPassword; displayName = '测试馆员'; role = 'LIBRARIAN' } '' 201
$script:state.accounts += @{ id = $staff.id; username = $staff.username; displayName = $staff.displayName; role = 'LIBRARIAN' }
Save-Checkpoint 'accounts-in-progress'
$script:librarian = Login 'test_librarian_1022' $initialPassword LIBRARIAN
$null = Call $librarian POST '/me/change-password' @{ oldPassword = $initialPassword; newPassword = $TestPassword }
$null = Register $guest 'test_reader1_1022' $TestPassword '测试读者一'
$null = Register $guest 'test_reader2_1022' $TestPassword '测试读者二'
$null = Register $guest 'test_overdue_1022' $TestPassword '测试逾期读者'
$readerA = Login 'test_reader1_1022' $TestPassword READER
$readerB = Login 'test_reader2_1022' $TestPassword READER
$readerC = Login 'test_overdue_1022' $TestPassword READER
Save-Checkpoint 'accounts-complete'
@{ password = $TestPassword; accounts = $script:state.accounts } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $taskOutput 'accounts.private.json') -Encoding utf8
Write-Output 'Phase 1 complete: five independent test accounts created; existing passwords unchanged.'

$genres = @('文学小说','历史文化','计算机技术','自然科学','艺术设计','心理成长','经管社会','学习方法')
foreach ($i in 0..7) {
  $category = Call $librarian POST '/categories' @{ name = "测试·$($genres[$i])"; code = "TEST1022_$($i + 1)"; enabled = $true; sortOrder = 20 + $i } '' 201
  $script:state.categories += $category
  Save-Checkpoint 'catalog-in-progress'
}
$titles = @(
  @('三体','刘慈欣'), @('活着','余华'), @('平凡的世界','路遥'),
  @('万历十五年','黄仁宇'), @('人类简史','尤瓦尔·赫拉利'), @('史记选读','司马迁'),
  @('深入理解计算机系统','Randal E. Bryant 等'), @('代码大全','Steve McConnell'), @('算法导论','Thomas H. Cormen 等'),
  @('时间简史','Stephen Hawking'), @('从一到无穷大','George Gamow'), @('物种起源','Charles Darwin'),
  @('艺术的故事','E. H. Gombrich'), @('设计心理学','Donald Norman'), @('美的历程','李泽厚'),
  @('被讨厌的勇气','岸见一郎、古贺史健'), @('终身成长','Carol Dweck'), @('思考，快与慢','Daniel Kahneman'),
  @('经济学原理','N. Gregory Mankiw'), @('乡土中国','费孝通'), @('学会提问','M. Neil Browne 等'),
  @('如何阅读一本书','Mortimer Adler 等'), @('学习之道','Barbara Oakley'), @('刻意练习','Anders Ericsson 等')
)
foreach ($i in 0..23) {
  $genreIndex = [int][Math]::Floor($i / 3)
  $category = $script:state.categories[$genreIndex]
  $input = @{
    isbn = $null; title = "【测试】$($titles[$i][0])"; author = $titles[$i][1]; categoryId = $category.id;
    publisher = '测试资料出版社'; publishedOn = '2024-09-01'; keywords = "测试数据,$($genres[$genreIndex]),本机验收";
    description = "本书目用于本机图书管理系统测试，书名与作者仅用于展示检索效果，出版社和出版日期为测试值，不代表具体出版版本。`n`n可用于查看书目详情、分类筛选、可借数量、预约排队及馆员借还流程。请在真实业务录入前另行核对正式馆藏资料。";
    coverPath = $null; enabled = ($i -ne 23)
  }
  $book = Call $librarian POST '/books' $input '' 201
  $copyCount = if ($i -eq 7) { 0 } elseif ($i -eq 9) { 1 } else { 3 }
  $copies = @()
  if ($copyCount -gt 0) {
    $barcodes = @(1..$copyCount | ForEach-Object { 'TEST1022-{0:D3}-{1:D2}' -f ($i + 1), $_ })
    $copies = @(Call $librarian POST "/books/$($book.id)/copies" @{ barcodes = $barcodes; shelfLocation = ('测试书架-{0:D2}' -f ($genreIndex + 1)) } '' 201)
  }
  $script:state.books += @{ id = $book.id; title = $book.title; enabled = $book.enabled; categoryId = $category.id; copies = $copies }
  Save-Checkpoint 'catalog-in-progress'
}
$books = $script:state.books
foreach ($target in @(@{Book=18;Copy=0;Status='MAINTENANCE'},@{Book=19;Copy=0;Status='RETIRED'},@{Book=20;Copy=1;Status='MAINTENANCE'},@{Book=21;Copy=2;Status='RETIRED'})) {
  $copy = $books[$target.Book].copies[$target.Copy]
  $null = Call $librarian PATCH "/copies/$($copy.id)" @{ targetStatus = $target.Status; version = $copy.version }
}
Save-Checkpoint 'catalog-complete'
Write-Output 'Phase 2 complete: eight categories, 24 books and 67 copies added.'

$loanA = Checkout $readerA $books[0]
$loanRenewed = Checkout $readerA $books[1]
$null = Call $readerA POST "/loans/$($loanRenewed.id)/renew" @{} (Key)
$ready = Reserve $readerA $books[9]
$waiting = Reserve $readerB $books[9]
$emptyQueue = Reserve $readerA $books[7]
$pickup = Reserve $readerB $books[2]
$fulfilled = Reserve $readerA $books[3]
$null = Checkout $readerA $books[3]
$null = Checkout $readerB $books[4]
$cancelled = Reserve $readerA $books[5]
$null = Call $readerA POST "/reservations/$($cancelled.id)/cancel" @{} (Key)
$overdueLoan = Checkout $readerC $books[8]
$history = @()
foreach ($i in 0..7) {
  $loan = Checkout $readerB $books[10 + $i]
  $null = Call $librarian POST "/loans/$($loan.id)/return" @{ copyBarcode = $loan.copyBarcode } (Key)
  $history += @{ id = $loan.id; readerId = $readerB.User.id; daysAgo = 3 + 3 * $i }
}
# Time shifts are restricted to newly created fixtures, so charts and overdue states can be tested now.
$timeSql = 'START TRANSACTION;' + "`n"
foreach ($item in $history) {
  $days = $item.daysAgo
  $returnDays = $days - 2
  $dueOffset = 30 - $days
  $timeSql += "UPDATE loans SET borrowed_at=UTC_TIMESTAMP()-INTERVAL $days DAY,returned_at=UTC_TIMESTAMP()-INTERVAL $returnDays DAY,due_date=DATE(UTC_TIMESTAMP()+INTERVAL 8 HOUR)+INTERVAL $dueOffset DAY WHERE id=$($item.id) AND reader_id=$($item.readerId) AND status='RETURNED';`n"
}
$timeSql += "UPDATE loans SET borrowed_at=UTC_TIMESTAMP()-INTERVAL 37 DAY,due_date=DATE(UTC_TIMESTAMP()+INTERVAL 8 HOUR)-INTERVAL 7 DAY WHERE id=$($overdueLoan.id) AND reader_id=$($readerC.User.id) AND status='ACTIVE';`nCOMMIT;"
$null = Sql $timeSql
Save-Checkpoint 'business-records-complete'
Write-Output 'Phase 3 complete: 13 loans and six reservations, including renewal, queue, pickup, history and overdue scenarios.'

$noticeInputs = @(
  @{title='【测试】开馆时间与借阅须知'; content="本公告为本机验收测试数据。`n开放时间：周一至周日 08:30—20:30（示例）。`n每位读者最多同时借阅 5 本，借期 30 天；符合条件时可续借 1 次、延长 15 天。实际资格以后端规则为准。"; action='publish'},
  @{title='【测试】新书推荐与主题书架'; content="本周测试书目已加入文学、历史、科学、计算机、设计等分类。`n可通过关键词或分类查找，进入详情查看可借数量。标注【测试】的书目均为验收数据。"; action='publish'},
  @{title='【测试】预约取书与排队说明'; content="预约分为排队中与待取。待取后请在截止日期当日结束前到馆，由馆员核对账号和副本条码办理借出。`n本公告用于测试列表、详情和长文本换行。"; action='publish'},
  @{title='【测试】阅读活动安排（草稿）'; content='草稿用于测试公告编辑与预览，仅员工可见。'; action='draft'},
  @{title='【测试】已结束的活动通知（撤下）'; content='撤下公告用于测试历史状态，不在公开公告列表中显示。'; action='withdraw'}
)
foreach ($input in $noticeInputs) {
  $notice = Call $librarian POST '/notices' @{ title = $input.title; content = $input.content } '' 201
  if ($input.action -ne 'draft') { $notice = Call $librarian POST "/notices/$($notice.id)/publish" }
  if ($input.action -eq 'withdraw') { $notice = Call $librarian POST "/notices/$($notice.id)/withdraw" }
  $script:state.notices += $notice
  Save-Checkpoint 'announcements-in-progress'
}
Save-Checkpoint 'announcements-complete'
Write-Output 'Phase 4 complete: five notices added (three published, one draft and one withdrawn).'

$checks = [Collections.Generic.List[string]]::new()
foreach ($account in $script:state.accounts) {
  $verified = Login $account.username $TestPassword $account.role
  $me = Call $verified GET '/auth/me'
  if ($me.id -ne $account.id -or $me.role -ne $account.role -or $me.mustChangePassword) { throw "Account verification failed: $($account.username)" }
  $checks.Add("Verified login and role: $($account.username)")
}
$readerLoans = Call $readerA GET '/me/loans?page=1&size=100'
$overdue = Call $librarian GET '/readers/lookup?username=test_overdue_1022'
$readerReservations = Call $readerA GET '/me/reservations?page=1&size=100'
$readerBReservations = Call $readerB GET '/me/reservations?page=1&size=100'
if (@($readerLoans.items | Where-Object status -eq 'ACTIVE').Count -ne 3) { throw 'Expected three active loans for reader one.' }
if ($overdue.overdueLoanCount -ne 1) { throw 'Expected one overdue loan for the dedicated test reader.' }
foreach ($status in @('READY','WAITING','FULFILLED','CANCELLED')) {
  if ($readerReservations.items.status -notcontains $status) { throw "Missing reader reservation state: $status" }
}
if (($readerBReservations.items | Where-Object id -eq $waiting.id).status -ne 'WAITING') { throw 'Expected the second reader to be waiting.' }
$null = Call $guest GET "/notices/$($script:state.notices[3].id)" $null '' 404
$null = Call $guest GET "/notices/$($script:state.notices[4].id)" $null '' 404
$overview = Call $admin GET '/stats/overview'
$trend = Call $librarian GET '/stats/loans-trend?days=30'
$top = Call $librarian GET '/stats/top-books?days=30&limit=10'
if ($trend.Count -ne 30 -or @($trend | Where-Object borrowedCount -gt 0).Count -lt 8) { throw 'Expected multi-day trend data.' }
$checks.Add('Reader one has three active loans and all four reservation states.')
$checks.Add('Dedicated overdue reader has one overdue loan; original readers untouched.')
$checks.Add('Second reader is queued behind the first reader for the same single-copy book.')
$checks.Add('Draft and withdrawn notices stay private.')
$checks.Add('Real statistics have 30 trend points and activity on at least eight days.')
$loanIds = @($script:state.loans.id)
$reservationIds = @($script:state.reservations.id)
$latestLoans = Call $librarian GET '/loans?page=1&size=100'
$latestReservations = Call $librarian GET '/reservations?page=1&size=100'
$script:state.loans = @($latestLoans.items | Where-Object { $_.id -in $loanIds })
$script:state.reservations = @($latestReservations.items | Where-Object { $_.id -in $reservationIds })
foreach ($book in $script:state.books) {
  $latestCopies = Call $librarian GET "/books/$($book.id)/copies?page=1&size=50"
  $book.copies = @($latestCopies.items)
}
$script:state.verification = @{ result = 'PASS'; checks = $checks; overview = $overview; trendActiveDays = @($trend | Where-Object borrowedCount -gt 0).Count; popularBooks = $top }
$script:state.summary = @{ accounts = 5; categories = 8; books = 24; visibleNewBooks = 23; copies = 67; loans = 13; activeLoans = 5; returnedLoans = 8; overdueLoans = 1; reservations = 6; notices = 5 }
Save-Checkpoint 'complete'
$script:state | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath (Join-Path $taskOutput 'result.json') -Encoding utf8
$script:state.summary | ConvertTo-Json -Compress | Write-Output
Write-Output 'All fixture checks passed. Passwords are saved only under ignored output/runtime/local-test-seed/accounts.private.json.'
