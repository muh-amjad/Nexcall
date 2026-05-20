# MeetUpProject
This is a video calling app project

## Prerequisites

- .NET 8 SDK
- Node.js 20+
- SQL Server LocalDB (or update API connection string)

## First-time setup

1. Install UI dependencies:

```powershell
cd NexcallUI
npm install
```

2. Restore API dependencies:

```powershell
cd NexcallApi/Nexcall.Api
dotnet restore
```

3. Apply EF Core migrations:

```powershell
cd NexcallApi/Nexcall.Api
dotnet ef database update
```

## Run frontend and backend together

From repository root:

```powershell
.\run-dev.ps1
```

This opens two PowerShell windows:
- API on `https://localhost:7248`
- Angular UI on `http://localhost:4200`

## Test coverage added

Backend integration tests are in `NexcallApi/Nexcall.Api.Tests` and cover:
- signup/login/refresh token flow
- authenticated user search
- call initiation via SignalR (incoming call event)

Run tests:

```powershell
cd NexcallApi
dotnet test
```
