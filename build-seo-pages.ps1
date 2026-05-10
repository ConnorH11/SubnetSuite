$routes = @("subnet", "vlsm", "supernet", "ipv6", "acl", "route", "binary", "converter", "visualizer", "simulator", "flashcards", "practice-test", "publicip", "maclookup", "cheatsheet", "overlap", "headers", "bandwidth", "ports", "about")

$sourceFile = "index.html"

foreach ($route in $routes) {
    if (-Not (Test-Path -Path $route)) {
        New-Item -ItemType Directory -Path $route | Out-Null
    }
    Copy-Item -Path $sourceFile -Destination "$route\index.html" -Force
}
Write-Host "SEO pages generated successfully!"
