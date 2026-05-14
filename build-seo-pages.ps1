$routesData = [ordered]@{
    "subnet" = @{
        Title = "IPv4 Subnet Calculator | SubnetSuite"
        Desc = "Calculate IPv4 subnets, network IDs, broadcast addresses, and usable host ranges instantly."
    }
    "vlsm" = @{
        Title = "VLSM Calculator | SubnetSuite"
        Desc = "Variable Length Subnet Mask (VLSM) calculator to efficiently partition an IP address space."
    }
    "supernet" = @{
        Title = "Supernetting & Route Summarization | SubnetSuite"
        Desc = "Calculate supernets and summarize multiple IP networks into a single routing prefix."
    }
    "ipv6" = @{
        Title = "IPv6 Subnet Calculator | SubnetSuite"
        Desc = "Easily calculate and expand IPv6 subnets, network ranges, and prefixes."
    }
    "acl" = @{
        Title = "Cisco ACL Generator | SubnetSuite"
        Desc = "Generate standard and extended Cisco Access Control Lists (ACLs) quickly and easily."
    }
    "route" = @{
        Title = "Cisco Route Generator | SubnetSuite"
        Desc = "Generate static routes, OSPF, and EIGRP configurations for Cisco routers."
    }
    "binary" = @{
        Title = "Binary to Decimal Calculator | SubnetSuite"
        Desc = "Convert between binary, decimal, and hexadecimal networking values."
    }
    "converter" = @{
        Title = "Base Converter | SubnetSuite"
        Desc = "Convert numbers between binary, octal, decimal, and hexadecimal bases for networking and computer science."
    }
    "visualizer" = @{
        Title = "Network Topology Visualizer | SubnetSuite"
        Desc = "Build and visualize network topologies interactively."
    }
    "simulator" = @{
        Title = "Network Simulator | SubnetSuite"
        Desc = "Practice Cisco and Juniper CLI commands in a virtual network simulation environment."
    }
    "flashcards" = @{
        Title = "IT Certification Flashcards | SubnetSuite"
        Desc = "Study for CCNA, Network+, Security+, and JNCIA with spaced-repetition flashcards."
    }
    "practice-test" = @{
        Title = "IT Certification Practice Tests | SubnetSuite"
        Desc = "Take realistic practice exams and PBQs for Cisco CCNA, CompTIA Network+, and more."
    }
    "publicip" = @{
        Title = "Public IP Checker | SubnetSuite"
        Desc = "Check your current public IPv4 and IPv6 address, ISP, location, and network details instantly."
    }
    "maclookup" = @{
        Title = "MAC Vendor Lookup | SubnetSuite"
        Desc = "Lookup MAC address vendor, OUI, and manufacturer details instantly using our comprehensive database."
    }
    "cheatsheet" = @{
        Title = "Subnetting Cheat Sheet | SubnetSuite"
        Desc = "Quick reference subnetting cheat sheet for IPv4 CIDR block sizes, wildcard masks, and usable host counts."
    }
    "overlap" = @{
        Title = "CIDR Overlap Checker | SubnetSuite"
        Desc = "Check for overlapping IP subnets and CIDR blocks to prevent routing conflicts in your network design."
    }
    "headers" = @{
        Title = "Packet Headers Reference | SubnetSuite"
        Desc = "Interactive reference diagrams for IPv4, IPv6, TCP, UDP, and Ethernet packet headers and fields."
    }
    "bandwidth" = @{
        Title = "Bandwidth Calculator | SubnetSuite"
        Desc = "Calculate network bandwidth, file download/upload times, and data transfer rates across different connection speeds."
    }
    "ports" = @{
        Title = "Common Network Ports Reference | SubnetSuite"
        Desc = "Searchable directory of common TCP and UDP network ports, protocols, and services for IT networking."
    }
    "about" = @{
        Title = "About SubnetSuite | Free Network Toolkit"
        Desc = "Learn about SubnetSuite, our mission to provide high-quality free networking tools, calculators, and simulators."
    }
}

$sourceContent = Get-Content -Path "index.html" -Raw

foreach ($key in $routesData.Keys) {
    $data = $routesData[$key]
    $routeDir = $key
    if (-Not (Test-Path -Path $routeDir)) {
        New-Item -ItemType Directory -Path $routeDir | Out-Null
    }

    $pageContent = $sourceContent
    
    $pageContent = $pageContent.Replace(
        '<title>SubnetSuite – Advanced Network Toolkit & Simulators</title>',
        "<title>$($data.Title)</title>"
    )
    $pageContent = $pageContent.Replace(
        '<meta name="description" content="SubnetSuite is a free, comprehensive network toolkit. Features include IPv4/IPv6 subnetting, VLSM, CIDR, ACL generation, a visual topology builder, network simulation, and spaced-repetition flashcards for CCNA, Network+, and more.">',
        "<meta name=`"description`" content=`"$($data.Desc)`">"
    )
    $pageContent = $pageContent.Replace(
        '<meta property="og:title" content="SubnetSuite – Advanced Network Toolkit & Simulators">',
        "<meta property=`"og:title`" content=`"$($data.Title)`">"
    )
    $pageContent = $pageContent.Replace(
        '<meta property="og:description" content="Master networking with free calculators, a visual topology builder, network simulators, and certification practice tests (CCNA, Network+).">',
        "<meta property=`"og:description`" content=`"$($data.Desc)`">"
    )
    $pageContent = $pageContent.Replace(
        '<meta property="twitter:title" content="SubnetSuite – Advanced Network Toolkit & Simulators">',
        "<meta property=`"twitter:title`" content=`"$($data.Title)`">"
    )
    $pageContent = $pageContent.Replace(
        '<meta property="twitter:description" content="Master networking with free calculators, a visual topology builder, network simulators, and certification practice tests.">',
        "<meta property=`"twitter:description`" content=`"$($data.Desc)`">"
    )
    $pageContent = $pageContent.Replace(
        '<link rel="canonical" href="https://subnetsuite.com/" id="canonical-link">',
        "<link rel=`"canonical`" href=`"https://subnetsuite.com/$routeDir/`" id=`"canonical-link`">"
    )

    Set-Content -Path "$routeDir\index.html" -Value $pageContent
}

$legacyRedirects = [ordered]@{
    "IPSubnet" = "subnet"
    "RouteGenerator" = "route"
    "MacLookup" = "maclookup"
    "BinaryCalc" = "binary"
    "VLSM" = "vlsm"
    "PublicIP" = "publicip"
    "supernetting" = "supernet"
    "ACLGenerator" = "acl"
    "IPv6" = "ipv6"
    "Visualizer" = "visualizer"
    "PingTraceroute" = "publicip"
    "Converter" = "converter"
    "About" = "about"
}

foreach ($oldDir in $legacyRedirects.Keys) {
    $newRoute = $legacyRedirects[$oldDir]
    if (-Not (Test-Path -Path $oldDir)) {
        New-Item -ItemType Directory -Path $oldDir | Out-Null
    }
    
    $targetUrl = "https://subnetsuite.com/$newRoute/"
    $redirectHtml = @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=$targetUrl">
  <link rel="canonical" href="$targetUrl">
  <title>Redirecting...</title>
  <script>
    window.location.replace("$targetUrl");
  </script>
</head>
<body>
  <p>Redirecting to <a href="$targetUrl">$targetUrl</a>...</p>
</body>
</html>
"@
    Set-Content -Path "$oldDir\index.html" -Value $redirectHtml
}

Write-Host "SEO pages generated successfully with individual metadata and trailing-slash canonical URLs!"
