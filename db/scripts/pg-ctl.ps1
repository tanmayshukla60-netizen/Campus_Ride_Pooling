# pg-ctl.ps1
# Helper script to control PostgreSQL service in user profile
param (
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "status", "restart", "init", "createdb")]
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"

$pgDir = "$env:USERPROFILE\pgsql"
$pgBin = "$pgDir\bin"
$pgData = "$env:USERPROFILE\pgsql_data"
$logFile = "$pgData\server.log"

if (-not (Test-Path "$pgBin\postgres.exe")) {
    Write-Error "PostgreSQL binaries not found at $pgBin"
    exit 1
}

# Add pgsql bin to process PATH if not present
if ($env:PATH -notlike "*$pgBin*") {
    $env:PATH = "$pgBin;$env:PATH"
}

switch ($Action) {
    "init" {
        if (-not (Test-Path "$pgData\PG_VERSION")) {
            Write-Host "Initializing PostgreSQL cluster at $pgData..."
            & "$pgBin\initdb.exe" -D $pgData -U postgres -A trust -E UTF8 --locale=C
            Write-Host "PostgreSQL cluster initialized."
        } else {
            Write-Host "PostgreSQL cluster already exists at $pgData."
        }
    }

    "start" {
        if (-not (Test-Path "$pgData\PG_VERSION")) {
            Write-Host "Cluster not found, initializing first..."
            & "$pgBin\initdb.exe" -D $pgData -U postgres -A trust -E UTF8 --locale=C
        }

        # Check if already running
        $status = & "$pgBin\pg_ctl.exe" -D $pgData status 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "PostgreSQL is already running."
        } else {
            Write-Host "Starting PostgreSQL server..."
            & "$pgBin\pg_ctl.exe" -D $pgData -l $logFile start
            Start-Sleep -Seconds 2
            & "$pgBin\pg_isready.exe" -U postgres -h localhost -p 5432
        }
    }

    "stop" {
        Write-Host "Stopping PostgreSQL server..."
        & "$pgBin\pg_ctl.exe" -D $pgData -m fast stop
    }

    "restart" {
        Write-Host "Restarting PostgreSQL server..."
        & "$pgBin\pg_ctl.exe" -D $pgData restart
    }

    "status" {
        & "$pgBin\pg_ctl.exe" -D $pgData status
    }

    "createdb" {
        Write-Host "Ensuring campus_rides database exists..."
        $dbs = & "$pgBin\psql.exe" -U postgres -h localhost -p 5432 -t -A -c "SELECT 1 FROM pg_database WHERE datname='campus_rides';" 2>&1
        if ($dbs -match "1") {
            Write-Host "Database 'campus_rides' already exists."
        } else {
            & "$pgBin\createdb.exe" -U postgres -h localhost -p 5432 campus_rides
            Write-Host "Database 'campus_rides' created."
        }
    }
}
