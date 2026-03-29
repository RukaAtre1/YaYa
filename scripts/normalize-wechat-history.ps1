param(
  [Parameter(Mandatory = $true)]
  [string]$DbPath,

  [string]$ContactName,

  [string]$ContactId
)

$args = @("scripts\\parse_wechat_history.py", "--db", $DbPath)

if ($ContactName) {
  $args += @("--contact-name", $ContactName)
}

if ($ContactId) {
  $args += @("--contact-id", $ContactId)
}

python @args
