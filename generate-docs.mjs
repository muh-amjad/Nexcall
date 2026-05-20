// generate-docs.mjs — run with: node generate-docs.mjs
// Generates D:\MeetUpProject\docs\Nexcall-ProjectDocs.docx

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  TableOfContents, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType, ShadingType,
  PageBreak, HorizontalPositionAlign, NumberFormat,
  convertInchesToTwip, LevelFormat,
} from 'docx';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR  = join(__dirname, 'docs');
const OUT_FILE = join(OUT_DIR, 'Nexcall-ProjectDocs.docx');
mkdirSync(OUT_DIR, { recursive: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────
const h1 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 120 } });
const h2 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 80  } });
const h3 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 60  } });

const body = (...runs) => new Paragraph({ children: runs, spacing: { after: 100 } });
const t    = (text, opts = {}) => new TextRun({ text, font: 'Calibri', size: 22, ...opts });
const bold = (text) => t(text, { bold: true });
const code = (text) => new TextRun({ text, font: 'Courier New', size: 20, color: '2E4057' });
const br   = () => new Paragraph({ children: [], spacing: { after: 60 } });

const bullet = (text, level = 0) => new Paragraph({
  text, bullet: { level },
  spacing: { after: 60 },
  style: 'ListParagraph',
});

const infoBox = (text) => new Paragraph({
  children: [new TextRun({ text, font: 'Calibri', size: 22, italics: true, color: '1a5276' })],
  shading: { type: ShadingType.SOLID, color: 'EBF5FB' },
  indent: { left: convertInchesToTwip(0.25), right: convertInchesToTwip(0.25) },
  spacing: { before: 60, after: 120 },
  border: { left: { style: BorderStyle.THICK, size: 6, color: '2E86C1' } },
});

const makeTable = (headers, rows) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({
      tableHeader: true,
      children: headers.map(h => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, font: 'Calibri', size: 20, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
        shading: { type: ShadingType.SOLID, color: '2E4057' },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
      })),
    }),
    ...rows.map((cells, ri) => new TableRow({
      children: cells.map(c => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: c, font: 'Calibri', size: 20 })] })],
        shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? 'FFFFFF' : 'F2F3F4' },
        margins: { top: 40, bottom: 40, left: 100, right: 100 },
      })),
    })),
  ],
});

const pageBreak = () => new Paragraph({ children: [new TextRun({ break: 1 })] });

// ─── Document Sections ────────────────────────────────────────────────────────
const titlePage = [
  br(), br(), br(),
  new Paragraph({
    children: [new TextRun({ text: 'Nexcall', font: 'Calibri', size: 72, bold: true, color: '2E4057' })],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Project Documentation', font: 'Calibri', size: 36, color: '5D6D7E' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Real-time multi-party video calling application', font: 'Calibri', size: 24, italics: true, color: '7F8C8D' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
  }),
  makeTable(
    ['Detail', 'Value'],
    [
      ['Project Name', 'Nexcall'],
      ['GitHub Repository', 'https://github.com/muh-amjad/Nexcall'],
      ['Backend', 'ASP.NET Core 8 + SignalR + EF Core 8'],
      ['Frontend', 'Angular 21 + NgRx Signals + WebRTC'],
      ['Document Version', '1.0 — Phase 0 Complete'],
      ['Last Updated', new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })],
    ]
  ),
  pageBreak(),
];

const sec1 = [
  h1('1. Project Overview'),
  body(t('Nexcall is a portfolio-grade, production-ready real-time video calling application. It serves as the foundation for the InterviewHub project (Phase 1+). Nexcall demonstrates full-stack engineering skills relevant to visa-sponsored roles in Europe, Australia, and the USA.')),
  br(),
  h2('1.1 What Nexcall Does'),
  bullet('User registration and login with JWT access tokens + refresh tokens'),
  bullet('Searchable user directory with real-time online/offline presence'),
  bullet('1-to-1 and multi-party video calls (up to 5 participants) via WebRTC'),
  bullet('Peer-to-peer signaling via SignalR (ICE candidates, SDP offers/answers)'),
  bullet('Camera and microphone toggle with real-time state propagation to all participants'),
  bullet('Instant meeting creation (no invite needed)'),
  bullet('Call invite / accept / decline flow'),
  bullet('Automatic reconnection on network interruption'),
  br(),
  h2('1.2 Tech Stack Summary'),
  makeTable(
    ['Layer', 'Technology', 'Version', 'Purpose'],
    [
      ['Backend Runtime', 'ASP.NET Core', '8.0', 'Web API + SignalR hub host'],
      ['ORM', 'Entity Framework Core', '8.0', 'Database access (code-first)'],
      ['Auth', 'ASP.NET Identity + JWT', '8.0', 'User management + token auth'],
      ['Real-time', 'SignalR', '8.0', 'WebSocket-based signaling hub'],
      ['Media', 'WebRTC (browser API)', 'native', 'Peer-to-peer video/audio streams'],
      ['Database', 'SQL Server 2022', 'latest', 'Persistent storage'],
      ['Frontend', 'Angular', '21', 'Single Page Application framework'],
      ['State', 'NgRx Signals', '21', 'Reactive state management'],
      ['Animation', 'GSAP', '3', 'UI animations'],
      ['E2E Tests', 'Playwright', 'latest', 'Multi-browser end-to-end tests'],
      ['Unit Tests', 'xUnit', '2.9', 'Backend integration tests'],
      ['Container', 'Docker + Compose', 'latest', 'Containerised deployment'],
      ['CI/CD', 'GitHub Actions', 'latest', 'Automated build and test pipeline'],
    ]
  ),
  pageBreak(),
];

const sec2 = [
  h1('2. Why These Technologies Were Chosen'),
  br(),
  h2('2.1 ASP.NET Core 8'),
  infoBox('Why it matters for visa jobs: .NET is the dominant enterprise stack in Europe (UK, Germany, Netherlands) and Australian government/banking sectors. Knowing it deeply is a visa sponsorship differentiator.'),
  body(t('ASP.NET Core is Microsoft\'s open-source, cross-platform web framework. It was chosen because:')),
  bullet('It is the most widely used backend framework in European enterprise (banks, SaaS, consulting firms)'),
  bullet('Native support for SignalR — no additional libraries needed for real-time communication'),
  bullet('Built-in Dependency Injection, Middleware pipeline, and OpenAPI (Swagger) support'),
  bullet('Strong typing with C# reduces runtime bugs and makes code more maintainable'),
  bullet('First-class Docker support with official Microsoft base images'),
  br(),
  h2('2.2 SignalR'),
  infoBox('SignalR is a Microsoft library that provides real-time, bidirectional communication between server and clients. It automatically selects the best transport: WebSockets, Server-Sent Events, or Long Polling.'),
  body(t('SignalR is used in Nexcall as the signaling layer for WebRTC. Its role:')),
  bullet('Exchanges SDP offers and answers between peers (describes what media each side can send/receive)'),
  bullet('Exchanges ICE candidates (network path discovery for the peer connection)'),
  bullet('Broadcasts call events: incoming call, accepted, declined, room updates'),
  bullet('Broadcasts media state changes (camera/mic on/off) to all room participants'),
  body(t('SignalR was chosen over raw WebSockets because it handles reconnection, groups (rooms), and authentication automatically.')),
  br(),
  h2('2.3 WebRTC (Web Real-Time Communication)'),
  infoBox('WebRTC is a browser-native API that enables direct peer-to-peer audio, video, and data streaming without any server in the media path. It is what makes the video call work without a dedicated media server.'),
  body(t('How WebRTC works in Nexcall (step by step):')),
  bullet('1. User A calls User B. Nexcall creates an RTCPeerConnection on both sides.', 0),
  bullet('2. User A creates an SDP "offer" (describes their media capabilities) and sends it via SignalR.', 0),
  bullet('3. User B receives the offer, creates an SDP "answer", and sends it back via SignalR.', 0),
  bullet('4. Both sides exchange ICE candidates (potential network paths) via SignalR.', 0),
  bullet('5. The browser picks the best ICE candidate pair and opens a direct peer connection.', 0),
  bullet('6. Video/audio streams flow directly between browsers — the server is no longer in the media path.', 0),
  body(t('This means the Nexcall server only handles the initial handshake. Video data never passes through the server, making it scalable and low-latency.')),
  br(),
  h2('2.4 Entity Framework Core (EF Core)'),
  infoBox('EF Core is Microsoft\'s official Object-Relational Mapper (ORM). It lets you work with your database using C# classes instead of writing SQL queries manually.'),
  body(t('EF Core was chosen for:')),
  bullet('Code-first migrations — the database schema is derived from C# entity classes'),
  bullet('LINQ queries compile to type-safe SQL — no string-based query vulnerabilities'),
  bullet('Supports SQL Server in production and SQLite in tests (same code, different provider)'),
  bullet('Built-in integration with ASP.NET Identity for user management'),
  br(),
  h2('2.5 JWT + Refresh Tokens'),
  infoBox('JSON Web Tokens (JWT) are stateless authentication tokens. A refresh token is a long-lived secret that lets the client get a new JWT without re-entering their password.'),
  body(t('The auth flow in Nexcall:')),
  bullet('Login/signup → server returns a short-lived JWT (3 hours) + a long-lived refresh token'),
  bullet('Angular auto-attaches the JWT to every HTTP request via an HttpInterceptor'),
  bullet('60 seconds before JWT expiry, Angular silently calls /api/auth/refresh to get a new JWT'),
  bullet('Refresh tokens are stored in the database and can be revoked (logout)'),
  bullet('SignalR hub connection passes the JWT via query string (?access_token=...) — required because browsers cannot set headers on WebSocket upgrades'),
  br(),
  h2('2.6 Angular 21 + NgRx Signals'),
  body(t('Angular was chosen because:')),
  bullet('It is the dominant frontend framework in European enterprise (banks, large SaaS) — aligns with visa target markets'),
  bullet('Standalone component architecture (no NgModules) — modern, cleaner code'),
  bullet('NgRx Signals provides fine-grained reactivity without the boilerplate of traditional NgRx reducers'),
  bullet('Strong TypeScript support throughout — consistent with the backend\'s strong typing philosophy'),
  br(),
  h2('2.7 Docker + Docker Compose'),
  infoBox('Docker packages an application and all its dependencies into a container — a lightweight, isolated environment that runs identically on any machine. Docker Compose orchestrates multiple containers (API + database + frontend) with a single command.'),
  body(t('Why Docker was added for this portfolio project:')),
  bullet('"docker compose up" — any reviewer can run the full stack in 2 minutes on any OS without installing .NET, Node, or SQL Server'),
  bullet('Demonstrates DevOps awareness — a hard requirement for senior roles in EU/AU companies'),
  bullet('The multi-stage Angular Dockerfile (Node build → nginx serve) shows production deployment thinking'),
  bullet('SQL Server runs in a container — no local SQL Server installation required'),
  br(),
  h2('2.8 GitHub Actions CI/CD'),
  infoBox('CI/CD stands for Continuous Integration / Continuous Deployment. GitHub Actions automatically runs your build and tests every time you push code. This catches broken builds before they reach main.'),
  body(t('The Nexcall CI pipeline (.github/workflows/ci.yml) does the following on every push to main:')),
  bullet('build-api job: dotnet restore → dotnet build → dotnet test (xUnit integration tests)'),
  bullet('build-ui job: npm ci → ng build --configuration production (in parallel with API build)'),
  bullet('docker-build job: builds both Docker images — runs only after both above jobs pass'),
  body(t('The pipeline proves that the project builds and all tests pass on a clean machine — not just on your laptop.')),
  br(),
  h2('2.9 Railway (Planned Deployment Target)'),
  infoBox('Railway is a cloud platform similar to Heroku. It lets you deploy Docker containers or direct code repositories with minimal configuration. It has a free tier that supports .NET applications with SQL Server add-ons.'),
  body(t('Railway was chosen for the API deployment because:')),
  bullet('Free tier supports .NET 8 + SQL Server — no credit card required for portfolio demo'),
  bullet('Connects directly to GitHub — deploys automatically on push to main'),
  bullet('Environment variables (JWT key, DB connection string) are set in the Railway dashboard — never hardcoded in code'),
  bullet('Provides a permanent HTTPS URL for the live API demo'),
  body(t('Note: Railway\'s free tier sleeps after 30 minutes of inactivity. The first request after sleep takes ~5 seconds. This will be noted in the project README.')),
  br(),
  h2('2.10 Vercel (Planned Frontend Deployment Target)'),
  infoBox('Vercel is a frontend hosting platform optimised for static sites and Single Page Applications. It provides automatic HTTPS, global CDN, and instant rollbacks.'),
  body(t('Vercel was chosen for the Angular UI because:')),
  bullet('Free tier with no usage limits for personal projects'),
  bullet('Deploys automatically from GitHub on every push to main'),
  bullet('Built-in CDN serves the Angular bundle from edge nodes globally — fast demo for any reviewer'),
  bullet('Environment variable support — API_URL can be set per environment (dev/prod)'),
  pageBreak(),
];

const sec3 = [
  h1('3. Project Structure'),
  br(),
  h2('3.1 Repository Layout'),
  new Paragraph({
    children: [
      code('D:\\MeetUpProject\\\n'),
      code('├── .github/\n'),
      code('│   └── workflows/\n'),
      code('│       └── ci.yml              ← GitHub Actions pipeline\n'),
      code('├── MeetUpApi/                  ← Backend (to be renamed NexcallApi)\n'),
      code('│   ├── NexcallApi.sln          ← Solution file\n'),
      code('│   ├── MeetUp.Api/             ← Main API project (to be renamed Nexcall.Api)\n'),
      code('│   │   ├── Controllers/        ← HTTP endpoints\n'),
      code('│   │   ├── Data/               ← AppDbContext (EF Core)\n'),
      code('│   │   ├── Dtos/               ← Data Transfer Objects\n'),
      code('│   │   ├── Entities/           ← Domain entities (ApplicationUser, RefreshToken)\n'),
      code('│   │   ├── Hubs/               ← SignalR CallHub\n'),
      code('│   │   ├── Migrations/         ← EF Core migrations\n'),
      code('│   │   ├── Options/            ← Configuration POCOs\n'),
      code('│   │   ├── Repositories/       ← Data access layer\n'),
      code('│   │   ├── Services/           ← Business logic (TokenService)\n'),
      code('│   │   ├── Dockerfile\n'),
      code('│   │   └── Program.cs          ← App composition root\n'),
      code('│   └── MeetUp.Api.Tests/       ← Integration + unit tests (to be renamed Nexcall.Api.Tests)\n'),
      code('│       └── Integration/        ← xUnit tests (AuthFlow, CallHub)\n'),
      code('├── MeetUpUI/                   ← Angular 21 frontend (to be renamed NexcallUI)\n'),
      code('│   ├── src/app/\n'),
      code('│   │   ├── pages/              ← Route-level components\n'),
      code('│   │   ├── services/           ← AuthService, SignalrService, etc.\n'),
      code('│   │   ├── store/              ← NgRx state (actions, reducers, facades)\n'),
      code('│   │   ├── guards/             ← Auth route guard\n'),
      code('│   │   └── interceptors/       ← JWT + token refresh interceptor\n'),
      code('│   ├── Dockerfile              ← Multi-stage Node → nginx build\n'),
      code('│   ├── nginx.conf              ← SPA fallback config\n'),
      code('│   └── e2e/                    ← Playwright end-to-end tests\n'),
      code('├── docker-compose.yml          ← Full stack in one command\n'),
      code('└── run-dev.ps1                 ← Local dev launcher\n'),
    ],
    spacing: { after: 200 },
  }),
  br(),
  h2('3.2 Pending Folder Renames (Manual Step Required)'),
  infoBox('The 4 folder renames below could not be done automatically because VS Code\'s language server (Roslyn) holds open handles on those directories. Close VS Code, rename in File Explorer, then reopen.'),
  makeTable(
    ['Current Name', 'Rename To', 'Why'],
    [
      ['MeetUpApi\\',            'NexcallApi\\',            'Top-level backend folder'],
      ['MeetUpApi\\MeetUp.Api\\', 'NexcallApi\\Nexcall.Api\\', 'Main API project folder'],
      ['MeetUpApi\\MeetUp.Api.Tests\\', 'NexcallApi\\Nexcall.Api.Tests\\', 'Test project folder'],
      ['MeetUpUI\\',             'NexcallUI\\',             'Frontend folder'],
    ]
  ),
  body(t('After renaming, update these two files:')),
  bullet('NexcallApi.sln — change "MeetUp.Api\\" path references to "Nexcall.Api\\"'),
  bullet('Nexcall.Api.Tests.csproj — change "..\\.MeetUp.Api\\Nexcall.Api.csproj" to "..\\Nexcall.Api\\Nexcall.Api.csproj"'),
  body(t('Then run: '), code('dotnet build NexcallApi.sln'), t(' to verify.')),
  pageBreak(),
];

const sec4 = [
  h1('4. Key Patterns Explained'),
  br(),
  h2('4.1 Repository Pattern'),
  body(t('Instead of calling the database directly from controllers, Nexcall uses repository interfaces ('), code('IUserRepository'), t(', '), code('IRefreshTokenRepository'), t('). This:')),
  bullet('Makes controllers testable — tests inject a fake/in-memory repository'),
  bullet('Decouples business logic from EF Core — switching databases requires only changing the infrastructure class'),
  bullet('Common in European enterprise .NET codebases — interviewers recognise and value it'),
  br(),
  h2('4.2 Options Pattern'),
  body(t('JWT configuration (key, issuer, audience, expiry) is loaded from '), code('appsettings.json'), t(' into a strongly-typed '), code('JwtOptions'), t(' class via '), code('IOptions<JwtOptions>'), t('. This prevents magic strings and makes configuration changes type-safe.')),
  br(),
  h2('4.3 HttpInterceptor (Angular)'),
  body(t('The '), code('auth.interceptor.ts'), t(' automatically attaches the JWT Bearer token to every outgoing HTTP request. If a request returns 401, it transparently refreshes the token and retries the request — the calling code never knows this happened.')),
  br(),
  h2('4.4 NgRx Signals'),
  body(t('NgRx Signals combines the predictability of the NgRx store (unidirectional data flow, actions, reducers) with Angular 17+ Signals (fine-grained reactivity). The '), code('UsersFacade'), t(' and '), code('CallFacade'), t(' classes expose signals that Angular templates subscribe to automatically — no manual subscriptions or change detection calls.')),
  br(),
  h2('4.5 ConcurrentDictionary in CallHub'),
  body(t('The SignalR '), code('CallHub'), t(' stores all connected users, room memberships, and pending call invites in static '), code('ConcurrentDictionary'), t(' collections. This is thread-safe for a single server instance.')),
  infoBox('Known limitation: This in-memory state does not survive server restarts and does not support horizontal scaling. In production, this would be backed by Redis using SignalR\'s Redis backplane. This is documented as a "future improvement" in the README.'),
  pageBreak(),
];

const sec5 = [
  h1('5. Phase Roadmap'),
  br(),
  makeTable(
    ['Phase', 'Name', 'Status', 'Description'],
    [
      ['0', 'Polish Nexcall',            '✅ Complete', 'Rename, Docker Compose, GitHub Actions CI, this documentation'],
      ['1', 'InterviewHub Scaffolding',  '⏳ Planned',  'New solution with Clean Architecture (Domain/Application/Infrastructure/API)'],
      ['2', 'Auth (Reuse)',              '⏳ Planned',  'Copy JWT + Identity auth from Nexcall verbatim'],
      ['3', 'Interview Session Domain', '⏳ Planned',  'Entities + CQRS with MediatR + REST API for sessions'],
      ['4', 'Code Sync Hub',            '⏳ Planned',  'SignalR CodeHub for real-time code sharing'],
      ['5', 'Video Call (Reuse)',        '⏳ Planned',  'Copy CallHub + WebRTC layer from Nexcall (1:1 only)'],
      ['6', 'Judge0 Code Execution',    '⏳ Planned',  'Run code in-browser during interview via Judge0 CE API'],
      ['7', 'Angular Frontend',         '⏳ Planned',  'Monaco editor + video panel + interview room layout'],
      ['8', 'Dashboard & Pages',        '⏳ Planned',  'Create session, join, summary, PDF export'],
      ['9', 'Testing',                  '⏳ Planned',  'Integration tests (SessionFlow, CodeHub) + Playwright E2E'],
      ['10', 'Deploy',                  '⏳ Planned',  'Docker Compose + GitHub Actions + Railway + Vercel'],
    ]
  ),
  pageBreak(),
];

const sec6 = [
  h1('6. Running the Project Locally'),
  br(),
  h2('6.1 Quick Start (Docker Compose)'),
  body(bold('Requirements: '), t('Docker Desktop installed and running.')),
  new Paragraph({
    children: [code('cd D:\\MeetUpProject\ndocker compose up --build')],
    spacing: { after: 100 },
  }),
  body(t('This starts: SQL Server on port 1433, the API on port 8080 (Swagger at http://localhost:8080/swagger), and the Angular UI on port 4200.')),
  br(),
  h2('6.2 Local Dev (Hot Reload)'),
  body(t('Run the PowerShell script at the repo root:')),
  new Paragraph({ children: [code('.\\run-dev.ps1')], spacing: { after: 100 } }),
  body(t('This opens two separate terminals: the API with '), code('dotnet watch run --launch-profile https'), t(' (https://localhost:7248) and the Angular UI with '), code('npm start'), t(' (http://localhost:4200).')),
  br(),
  h2('6.3 Run Tests'),
  new Paragraph({ children: [code('cd MeetUpApi && dotnet test NexcallApi.sln')], spacing: { after: 100 } }),
  body(t('Tests use an SQLite in-memory database — no SQL Server required to run them.')),
];

// ─── Assemble document ────────────────────────────────────────────────────────
const doc = new Document({
  numbering: { config: [] },
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 22 },
        paragraph: { spacing: { line: 360 } },
      },
      heading1: { run: { font: 'Calibri', size: 36, bold: true, color: '2E4057' }, paragraph: { spacing: { before: 400, after: 120 } } },
      heading2: { run: { font: 'Calibri', size: 28, bold: true, color: '1A5276' }, paragraph: { spacing: { before: 280, after: 80  } } },
      heading3: { run: { font: 'Calibri', size: 24, bold: true, color: '2874A6' }, paragraph: { spacing: { before: 200, after: 60  } } },
    },
    paragraphStyles: [{
      id: 'ListParagraph',
      name: 'List Paragraph',
      basedOn: 'Normal',
      run: { font: 'Calibri', size: 22 },
      paragraph: { indent: { left: convertInchesToTwip(0.5) }, spacing: { after: 60 } },
    }],
  },
  sections: [{
    properties: {
      page: {
        margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.25), right: convertInchesToTwip(1.25) },
      },
    },
    children: [
      ...titlePage,
      ...sec1,
      ...sec2,
      ...sec3,
      ...sec4,
      ...sec5,
      ...sec6,
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUT_FILE, buffer);
console.log(`✅ Written: ${OUT_FILE}`);
