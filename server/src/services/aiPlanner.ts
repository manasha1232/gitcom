import { prisma } from '../prisma';

export interface ProjectAnalysis {
  applicationType: string;
  frontendRequirements: string[];
  backendRequirements: string[];
  databaseRequirements: string[];
  authenticationRequirements: string[];
  apis: string[];
  aiFeatures: string[];
  majorFeatures: string[];
  uiPages: string[];
  components: string[];
  infrastructure: string[];
  testingRequirements: string[];
  deploymentRequirements: string[];
  architectureNotes: string;
}

export interface PlannedTask {
  taskNumber: number;
  title: string;
  description: string;
  category: string;
  targetFiles: string[];
  expectedChanges: string;
  prerequisites: number[];
  reasoning: string;
}

export interface PlannedDay {
  dayNumber: number;
  title: string;
  focusArea: string;
  tasks: PlannedTask[];
}

export interface MasterDevelopmentPlan {
  summary: string;
  applicationType: string;
  frontendStack: string;
  backendStack: string;
  databaseStack: string;
  authStrategy: string;
  apiStructure: string;
  aiFeatures: string;
  testingStrategy: string;
  deploymentConfig: string;
  architectureNotes: string;
  days: PlannedDay[];
}

export class AIPlannerService {
  /**
   * Analyzes project description using AI or intelligent domain parser
   */
  async analyzeProject(name: string, description: string): Promise<ProjectAnalysis> {
    const settings = await prisma.systemSettings.findFirst();

    // If Gemini API key is configured, we can query Gemini
    if (settings?.aiApiKey && settings?.aiProvider === 'gemini') {
      try {
        const result = await this.queryGeminiForAnalysis(name, description, settings.aiApiKey);
        if (result) return result;
      } catch (err) {
        console.warn('Gemini API analysis failed, falling back to autonomous synthesizer:', err);
      }
    }

    return this.synthesizeAnalysis(name, description);
  }

  /**
   * Generates Master Plan with exact commitsPerDay for durationDays
   */
  async generateMasterPlan(
    name: string,
    description: string,
    durationDays = 20,
    commitsPerDay = 15
  ): Promise<MasterDevelopmentPlan> {
    const analysis = await this.analyzeProject(name, description);
    const totalCommits = durationDays * commitsPerDay;

    const days: PlannedDay[] = [];
    let globalTaskNumber = 1;

    // Extract domain terms from project name & description
    const domainKeywords = this.extractDomainKeywords(name, description);
    const domainEntity = domainKeywords.primaryEntity;
    const domainSecondary = domainKeywords.secondaryEntity;
    const domainService = domainKeywords.serviceName;

    // Day themes & progression across durationDays
    const dayBlueprints = this.buildDayBlueprints(durationDays, name, domainKeywords);

    for (let d = 1; d <= durationDays; d++) {
      const blueprint = dayBlueprints[d - 1] || {
        title: `Day ${d}: System Refinement & Integration`,
        focusArea: 'Feature enhancement and system integration',
        phase: 'Integration',
      };

      const dayTasks: PlannedTask[] = [];

      // Generate exactly commitsPerDay meaningful tasks for this day
      for (let c = 1; c <= commitsPerDay; c++) {
        const taskSpec = this.generateTaskSpecification({
          dayNumber: d,
          commitInDay: c,
          globalTaskNumber,
          commitsPerDay,
          totalCommits,
          projectName: name,
          blueprint,
          domainEntity,
          domainSecondary,
          domainService,
          analysis,
        });

        dayTasks.push(taskSpec);
        globalTaskNumber++;
      }

      days.push({
        dayNumber: d,
        title: blueprint.title,
        focusArea: blueprint.focusArea,
        tasks: dayTasks,
      });
    }

    return {
      summary: `Autonomous ${durationDays}-Day master development plan for "${name}" producing ${totalCommits} verified, non-empty incremental commits (${commitsPerDay} commits/day).`,
      applicationType: analysis.applicationType,
      frontendStack: 'React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons',
      backendStack: 'Node.js + Express + TypeScript + REST Architecture',
      databaseStack: 'PostgreSQL + Prisma ORM Schema & Relational Models',
      authStrategy: 'JWT with Refresh Tokens, Password Hashing (bcrypt), Role-Based Access Control',
      apiStructure: 'RESTful modular endpoints with Zod request validation and error middleware',
      aiFeatures: analysis.aiFeatures.join('; '),
      testingStrategy: 'Vitest / Jest unit tests + Integration API testing + Component verification',
      deploymentConfig: 'Docker multi-stage containerization + GitHub Actions CI/CD workflows',
      architectureNotes: analysis.architectureNotes,
      days,
    };
  }

  private extractDomainKeywords(name: string, description: string) {
    const text = (name + ' ' + description).toLowerCase();

    let primaryEntity = 'Item';
    let secondaryEntity = 'Category';
    let serviceName = 'CoreEngine';

    if (text.includes('study') || text.includes('exam') || text.includes('student') || text.includes('course')) {
      primaryEntity = 'Schedule';
      secondaryEntity = 'Subject';
      serviceName = 'StudyPlannerEngine';
    } else if (text.includes('expense') || text.includes('finance') || text.includes('budget') || text.includes('money')) {
      primaryEntity = 'Expense';
      secondaryEntity = 'Budget';
      serviceName = 'FinancialEngine';
    } else if (text.includes('health') || text.includes('workout') || text.includes('fitness') || text.includes('diet')) {
      primaryEntity = 'Workout';
      secondaryEntity = 'Nutrition';
      serviceName = 'WellnessEngine';
    } else if (text.includes('task') || text.includes('project') || text.includes('todo') || text.includes('board')) {
      primaryEntity = 'TaskItem';
      secondaryEntity = 'Workspace';
      serviceName = 'WorkflowEngine';
    } else if (text.includes('e-commerce') || text.includes('shop') || text.includes('store') || text.includes('product')) {
      primaryEntity = 'Product';
      secondaryEntity = 'Order';
      serviceName = 'CommerceEngine';
    } else if (text.includes('social') || text.includes('chat') || text.includes('post') || text.includes('community')) {
      primaryEntity = 'Post';
      secondaryEntity = 'Channel';
      serviceName = 'InteractionEngine';
    }

    return { primaryEntity, secondaryEntity, serviceName };
  }

  private buildDayBlueprints(durationDays: number, name: string, keywords: any) {
    const e1 = keywords.primaryEntity;
    const e2 = keywords.secondaryEntity;

    const standard20DayTemplates = [
      { day: 1, title: 'Day 1: Project Initialization & Core Scaffolding', focusArea: 'Repository foundation, build configs, environment & routing shells' },
      { day: 2, title: 'Day 2: Authentication System & Identity Models', focusArea: 'User schema, password hashing, JWT sessions & auth endpoints' },
      { day: 3, title: 'Day 3: Database Models & Prisma Relational Architecture', focusArea: `${e1} and ${e2} database schemas, migrations & seeding` },
      { day: 4, title: 'Day 4: Core Domain CRUD & Validation Layers', focusArea: `Request DTOs, Zod schemas & foundational ${e1} endpoints` },
      { day: 5, title: 'Day 5: AI Engine Architecture & Prompt Orchestration', focusArea: 'AI prompt pipelines, LLM service layer & model integrations' },
      { day: 6, title: 'Day 6: Advanced Domain Logic & Calculation Services', focusArea: `Complex scheduling/processing rules for ${e1}` },
      { day: 7, title: 'Day 7: Frontend Design System & Component Library', focusArea: 'Theme tokens, navigation bars, cards, modals & status badges' },
      { day: 8, title: 'Day 8: User Authentication & Onboarding Views', focusArea: 'Login, registration, password recovery & protected routes' },
      { day: 9, title: 'Day 9: Primary Dashboard & Metrics Overview', focusArea: 'Hero KPI cards, progress rings, quick-actions & summary stats' },
      { day: 10, title: 'Day 10: Interactive Entity Management & Forms', focusArea: `Creation modals, edit drawers & dynamic form validation for ${e1}` },
      { day: 11, title: 'Day 11: AI Workspace & Recommendation Interface', focusArea: 'Interactive AI suggestions, schedule review & tuning panel' },
      { day: 12, title: 'Day 12: Secondary Domain Features & Categorization', focusArea: `${e2} management, tagging, filtering & grouping mechanisms` },
      { day: 13, title: 'Day 13: Real-Time Event Bus & WebSockets/SSE', focusArea: 'Live notifications, async job status streaming & agent alerts' },
      { day: 14, title: 'Day 14: Analytics, Charts & Trend Visualizations', focusArea: 'Interactive time-series charts, breakdown bars & metrics' },
      { day: 15, title: 'Day 15: Search, Filtering & Query Optimization', focusArea: 'Full-text query, multi-factor filtering, pagination & indexing' },
      { day: 16, title: 'Day 16: Automated Testing & Test Suite Suite', focusArea: 'Unit tests for models, integration tests for API endpoints' },
      { day: 17, title: 'Day 17: Edge Case Handling, Validation & Bug Fixes', focusArea: 'Error boundaries, fallback UI, rate limiting & sanitization' },
      { day: 18, title: 'Day 18: Performance Tuning & Asset Optimization', focusArea: 'Database index tuning, memoization, lazy loading & caching' },
      { day: 19, title: 'Day 19: Containerization, CI/CD & Production Config', focusArea: 'Dockerfile, docker-compose, GitHub Actions & env validation' },
      { day: 20, title: 'Day 20: Comprehensive Documentation & Final Release', focusArea: 'OpenAPI/Swagger specs, architecture guide, seeders & release tag' },
    ];

    if (durationDays === 20) return standard20DayTemplates;

    // Dynamically scale for any number of days
    const result = [];
    for (let d = 1; d <= durationDays; d++) {
      const ratio = (d - 1) / Math.max(durationDays - 1, 1);
      const mappedIndex = Math.min(Math.floor(ratio * standard20DayTemplates.length), standard20DayTemplates.length - 1);
      const template = standard20DayTemplates[mappedIndex];
      result.push({
        day: d,
        title: `Day ${d}: ${template.title.split(': ')[1] || 'Core Implementation'}`,
        focusArea: template.focusArea,
      });
    }
    return result;
  }

  private generateTaskSpecification(params: {
    dayNumber: number;
    commitInDay: number;
    globalTaskNumber: number;
    commitsPerDay: number;
    totalCommits: number;
    projectName: string;
    blueprint: any;
    domainEntity: string;
    domainSecondary: string;
    domainService: string;
    analysis: ProjectAnalysis;
  }): PlannedTask {
    const { dayNumber, commitInDay, globalTaskNumber, commitsPerDay, domainEntity, domainSecondary, domainService } = params;

    const taskPlan: any = this.getTaskPlanForDayAndIndex(dayNumber, commitInDay, domainEntity, domainSecondary, domainService);

    // Compute prerequisite task numbers (typically earlier sequential tasks)
    const prerequisites: number[] = [];
    if (globalTaskNumber > 1) {
      prerequisites.push(globalTaskNumber - 1);
    }
    if (globalTaskNumber > 5 && globalTaskNumber % 4 === 0) {
      prerequisites.push(globalTaskNumber - 4);
    }

    return {
      taskNumber: globalTaskNumber,
      title: taskPlan.title || `Day ${dayNumber} (Part ${commitInDay}/${commitsPerDay}): Implement ${domainEntity} feature`,
      description: taskPlan.description || taskPlan.desc || `Autonomous development step for ${domainEntity} implementation.`,
      category: taskPlan.category || taskPlan.cat || 'FEATURE',
      targetFiles: taskPlan.targetFiles || taskPlan.files || [`src/services/${domainEntity.toLowerCase()}.ts`],
      expectedChanges: taskPlan.expectedChanges || taskPlan.changes || `Implement ${domainEntity} functionality and integration.`,
      prerequisites,
      reasoning: taskPlan.reasoning || 'Drives continuous autonomous development progress.',
    };
  }

  private getTaskPlanForDayAndIndex(
    day: number,
    commitIndex: number,
    entity: string,
    secondary: string,
    service: string
  ) {
    const e = entity.toLowerCase();
    const s = secondary.toLowerCase();

    // 15 Specific tasks for each day archetype
    const dayMap: Record<number | string, Array<{ title: string; desc: string; cat: string; files: string[]; changes: string; reasoning: string }>> = {
      // DAY 1: Initialization & Foundation
      1: [
        {
          title: 'Initialize repository structure and TypeScript configuration',
          desc: 'Setup core folder hierarchies, package descriptors and TypeScript compiler options.',
          cat: 'CONFIG',
          files: ['tsconfig.json', 'package.json'],
          changes: 'Add tsconfig base rules, module resolution and scripts',
          reasoning: 'Establishes type safety foundation before code authoring.',
        },
        {
          title: 'Configure environment variables schema and validation',
          desc: 'Define typed environment configuration with Zod validation to prevent startup crashes.',
          cat: 'CONFIG',
          files: ['src/config/env.ts', '.env.example'],
          changes: 'Create typed EnvSchema and validation parser',
          reasoning: 'Guarantees all required runtime secrets are verified early.',
        },
        {
          title: 'Setup core logging and telemetry utility',
          desc: 'Implement structured JSON logger with timestamp, severity level and contextual tags.',
          cat: 'FEATURE',
          files: ['src/utils/logger.ts'],
          changes: 'Add Logger class with info, warn, error and debug methods',
          reasoning: 'Critical for runtime observability and error tracking.',
        },
        {
          title: 'Create HTTP status code constants and standard response helpers',
          desc: 'Establish unified API response envelope with success, data, error and metadata fields.',
          cat: 'REFACTOR',
          files: ['src/utils/apiResponse.ts'],
          changes: 'Export sendSuccess, sendError and PaginatedResponse interfaces',
          reasoning: 'Maintains API consistency across all future controller endpoints.',
        },
        {
          title: 'Implement centralized error handling middleware',
          desc: 'Catch unhandled exceptions and translate them into sanitized JSON error payloads.',
          cat: 'ERROR_HANDLING',
          files: ['src/middleware/errorHandler.ts', 'src/utils/errors.ts'],
          changes: 'Add AppError custom class and global Express error middleware',
          reasoning: 'Prevents server crashes and leaking internal stack traces.',
        },
        {
          title: 'Setup Express application entrypoint and middleware pipeline',
          desc: 'Wire up CORS, JSON body parser, URL-encoded parsing and request logger.',
          cat: 'BACKEND_API',
          files: ['src/app.ts'],
          changes: 'Initialize Express app and mount standard middleware chain',
          reasoning: 'Core server pipeline required before mounting individual routes.',
        },
        {
          title: 'Add system health check and uptime probe endpoint',
          desc: 'Expose /api/health returning status, uptime, memory usage and timestamp.',
          cat: 'BACKEND_API',
          files: ['src/routes/health.routes.ts'],
          changes: 'Create health router with system metrics probe',
          reasoning: 'Essential for container readiness and load balancer verification.',
        },
        {
          title: 'Configure Prisma ORM datasource and client singleton',
          desc: 'Setup Prisma connection pool with retry logic and graceful shutdown hook.',
          cat: 'DATABASE_MODEL',
          files: ['src/lib/prisma.ts', 'prisma/schema.prisma'],
          changes: 'Initialize PrismaClient singleton with event logging',
          reasoning: 'Single database client instance prevents connection exhaustion.',
        },
        {
          title: 'Setup React client application scaffolding with Vite',
          desc: 'Configure Vite build tool, React root and HTML entry container.',
          cat: 'COMPONENT',
          files: ['client/src/main.tsx', 'client/index.html'],
          changes: 'Mount React StrictMode root to DOM container',
          reasoning: 'Initializes the client-side single page application foundation.',
        },
        {
          title: 'Configure Tailwind CSS design system and color palette',
          desc: 'Define custom theme tokens, dark mode palette, typography and animations.',
          cat: 'UI',
          files: ['client/tailwind.config.js', 'client/src/index.css'],
          changes: 'Configure extended colors, fonts and global dark styles',
          reasoning: 'Provides unified visual design language across all UI views.',
        },
        {
          title: 'Create client-side API client with axios interceptors',
          desc: 'Implement HTTP transport layer with automatic auth header injection and 401 handling.',
          cat: 'FEATURE',
          files: ['client/src/api/client.ts'],
          changes: 'Create configured axios instance with interceptors',
          reasoning: 'Centralizes client-side HTTP communication and token refresh.',
        },
        {
          title: 'Setup React Router with application route skeleton',
          desc: 'Define top-level BrowserRouter, route constants and lazy route wrappers.',
          cat: 'COMPONENT',
          files: ['client/src/routes/AppRoutes.tsx'],
          changes: 'Add Route definitions for Dashboard, Auth and Settings',
          reasoning: 'Enables client-side navigation and URL state synchronization.',
        },
        {
          title: 'Create base application shell layout and container',
          desc: 'Implement AppLayout with responsive sidebar slot, topbar and content view.',
          cat: 'UI',
          files: ['client/src/layouts/AppLayout.tsx'],
          changes: 'Build responsive grid shell with header and main viewport',
          reasoning: 'Provides consistent navigation frame for all child views.',
        },
        {
          title: 'Create unit testing harness with Vitest / Jest configuration',
          desc: 'Setup test runner, mocking utilities and sample sanity test.',
          cat: 'TEST',
          files: ['tests/setup.ts', 'tests/sanity.test.ts'],
          changes: 'Configure test environment and assert baseline arithmetic',
          reasoning: 'Verifies CI testing pipeline is functioning before writing tests.',
        },
        {
          title: 'Create comprehensive repository README and architecture overview',
          desc: 'Document system overview, prerequisite tools, setup instructions and scripts.',
          cat: 'DOCS',
          files: ['README.md'],
          changes: 'Write markdown architecture guide and quickstart commands',
          reasoning: 'Clarifies setup procedure for all team contributors.',
        },
      ],

      // DAY 2: Authentication & Security
      2: [
        {
          title: 'Define User database model and credential schemas in Prisma',
          desc: 'Add User table with email, passwordHash, name, role and timestamps.',
          cat: 'DATABASE_MODEL',
          files: ['prisma/schema.prisma'],
          changes: 'Add User model with unique email and indexed fields',
          reasoning: 'Foundational data schema for user identities and relationships.',
        },
        {
          title: 'Implement cryptographic password hashing with bcrypt',
          desc: 'Create secure hashing and password verification utilities with high salt rounds.',
          cat: 'AUTH',
          files: ['src/utils/security.ts'],
          changes: 'Export hashPassword and verifyPassword helper functions',
          reasoning: 'Ensures plaintext passwords are never stored in the database.',
        },
        {
          title: 'Implement JWT token generation and verification service',
          desc: 'Issue signed access tokens and refresh tokens with expiration policies.',
          cat: 'AUTH',
          files: ['src/services/token.service.ts'],
          changes: 'Add generateAccessToken and verifyToken methods',
          reasoning: 'Stateless authentication mechanism for scalable REST APIs.',
        },
        {
          title: 'Create authentication request validation schemas with Zod',
          desc: 'Validate email format, password complexity rules and name strings.',
          cat: 'VALIDATION',
          files: ['src/validators/auth.validator.ts'],
          changes: 'Define registerSchema and loginSchema with custom error messages',
          reasoning: 'Rejects malformed auth payloads before touching the database.',
        },
        {
          title: 'Implement user registration service and duplicate checking',
          desc: 'Handle user account creation, prevent duplicate emails and normalize inputs.',
          cat: 'BACKEND_API',
          files: ['src/services/auth.service.ts'],
          changes: 'Add registerUser business logic with email uniqueness check',
          reasoning: 'Core account creation logic separated from transport layer.',
        },
        {
          title: 'Create POST /api/auth/register endpoint',
          desc: 'Wire registration controller with validation middleware and response serialization.',
          cat: 'BACKEND_API',
          files: ['src/controllers/auth.controller.ts', 'src/routes/auth.routes.ts'],
          changes: 'Mount register route with schema validation',
          reasoning: 'Exposes account registration to client applications.',
        },
        {
          title: 'Implement user login service with credential verification',
          desc: 'Verify user credentials, generate token pair and update last login timestamp.',
          cat: 'BACKEND_API',
          files: ['src/services/auth.service.ts'],
          changes: 'Add loginUser method returning user payload and JWT token',
          reasoning: 'Authenticates returning users securely.',
        },
        {
          title: 'Create POST /api/auth/login endpoint',
          desc: 'Handle login request with rate limiting and secure cookie or bearer response.',
          cat: 'BACKEND_API',
          files: ['src/controllers/auth.controller.ts'],
          changes: 'Add login action handler returning JWT tokens',
          reasoning: 'Public entrypoint for user authentication.',
        },
        {
          title: 'Implement authentication guard middleware',
          desc: 'Extract Bearer token from Authorization header and attach user payload to request.',
          cat: 'AUTH',
          files: ['src/middleware/authGuard.ts'],
          changes: 'Export requireAuth middleware checking JWT validity',
          reasoning: 'Protects private endpoints from unauthenticated access.',
        },
        {
          title: 'Create GET /api/auth/me session verification endpoint',
          desc: 'Return current authenticated user profile without exposing sensitive fields.',
          cat: 'BACKEND_API',
          files: ['src/controllers/auth.controller.ts'],
          changes: 'Add getCurrentUser endpoint protected by requireAuth',
          reasoning: 'Allows client app to verify active session on boot.',
        },
        {
          title: 'Create client-side AuthContext and state management hook',
          desc: 'Store current user session, token persistence and login/logout handlers.',
          cat: 'FEATURE',
          files: ['client/src/contexts/AuthContext.tsx'],
          changes: 'Create AuthProvider with useAuth custom hook',
          reasoning: 'Provides authentication state to all React components.',
        },
        {
          title: 'Build Login UI screen with responsive form and error alerts',
          desc: 'Create email and password input fields, remember-me toggle and submit states.',
          cat: 'UI',
          files: ['client/src/pages/Login.tsx'],
          changes: 'Implement responsive login page with dark glass styling',
          reasoning: 'Primary interface for user authentication.',
        },
        {
          title: 'Build Registration UI screen with password strength indicator',
          desc: 'Create signup form with name, email, password confirmation and validations.',
          cat: 'UI',
          files: ['client/src/pages/Register.tsx'],
          changes: 'Implement registration form with real-time feedback',
          reasoning: 'Enables new users to register an account.',
        },
        {
          title: 'Create ProtectedRoute route guard component for React Router',
          desc: 'Redirect unauthenticated users to login page while preserving target path.',
          cat: 'COMPONENT',
          files: ['client/src/components/ProtectedRoute.tsx'],
          changes: 'Add ProtectedRoute wrapper checking useAuth isAuthenticated',
          reasoning: 'Prevents unauthorized browsing of authenticated pages.',
        },
        {
          title: 'Write automated unit tests for authentication service and JWT tokens',
          desc: 'Verify password hashing accuracy, token expiration and invalid credentials.',
          cat: 'TEST',
          files: ['tests/auth.service.test.ts'],
          changes: 'Add unit tests for hashPassword, verifyPassword and registerUser',
          reasoning: 'Guarantees security logic behaves as expected under test vectors.',
        },
      ],

      // DAY 3: Database Models & Relational Architecture
      3: [
        {
          title: `Define ${entity} primary database model in Prisma schema`,
          desc: `Create relational model for ${entity} with title, description, status and foreign keys.`,
          cat: 'DATABASE_MODEL',
          files: ['prisma/schema.prisma'],
          changes: `Add model ${entity} with user relation and status enum`,
          reasoning: `Foundational relational model for the project core entity.`,
        },
        {
          title: `Define ${secondary} secondary relational model in Prisma schema`,
          desc: `Add ${secondary} model linked to ${entity} and User with priority and category tags.`,
          cat: 'DATABASE_MODEL',
          files: ['prisma/schema.prisma'],
          changes: `Add model ${secondary} with foreign key constraints and onDelete cascade`,
          reasoning: `Enables structured categorization and grouping.`,
        },
        {
          title: `Create database indexes for ${entity} search and user filtering`,
          desc: 'Add composite indexes on (userId, createdAt) and status for fast lookups.',
          cat: 'PERFORMANCE',
          files: ['prisma/schema.prisma'],
          changes: 'Add @@index directives on high-frequency query columns',
          reasoning: 'Prevents sequential full table scans as dataset grows.',
        },
        {
          title: `Implement ${entity} database repository abstraction layer`,
          desc: 'Encapsulate Prisma queries into typed repository methods for clean isolation.',
          cat: 'DATABASE_MODEL',
          files: [`src/repositories/${e}.repository.ts`],
          changes: `Create ${entity}Repository with findById, findByUser and create methods`,
          reasoning: 'Decouples persistence layer from business services.',
        },
        {
          title: `Implement ${secondary} database repository abstraction layer`,
          desc: `Create repository methods for ${secondary} querying, creation and bulk association.`,
          cat: 'DATABASE_MODEL',
          files: [`src/repositories/${s}.repository.ts`],
          changes: `Create ${secondary}Repository with relational joins and filters`,
          reasoning: 'Encapsulates data queries for secondary entities.',
        },
        {
          title: 'Create database migration script and schema push utility',
          desc: 'Automate schema synchronization and migration history recording.',
          cat: 'CONFIG',
          files: ['scripts/dbMigrate.ts'],
          changes: 'Add script to execute Prisma migration in automated CI flows',
          reasoning: 'Ensures reproducible database schema across staging environments.',
        },
        {
          title: 'Create database seeder with realistic test data',
          desc: `Populate database with sample users, ${entity} items and ${secondary} relations.`,
          cat: 'DATABASE_MODEL',
          files: ['prisma/seed.ts'],
          changes: `Add seeder script with mock ${e} records and dependencies`,
          reasoning: 'Accelerates local development and manual verification.',
        },
        {
          title: `Define TypeScript domain types and interfaces for ${entity}`,
          desc: `Export typed interfaces, DTOs and status enums for ${entity}.`,
          cat: 'FEATURE',
          files: [`src/types/${e}.types.ts`],
          changes: `Create ${entity}DTO, Create${entity}Input and ${entity}Status enums`,
          reasoning: 'Shared domain contracts across backend controllers and services.',
        },
        {
          title: `Define TypeScript domain types and interfaces for ${secondary}`,
          desc: `Export interfaces, filter criteria and update DTOs for ${secondary}.`,
          cat: 'FEATURE',
          files: [`src/types/${s}.types.ts`],
          changes: `Create ${secondary}DTO and Filter${secondary}Params types`,
          reasoning: 'Maintains compile-time type safety for categorization features.',
        },
        {
          title: 'Create data sanitization and output transformation utility',
          desc: 'Strip sensitive database columns before returning payloads to client.',
          cat: 'SECURITY',
          files: ['src/utils/serializer.ts'],
          changes: 'Add sanitizeEntity function removing internal IDs and hashes',
          reasoning: 'Guarantees internal system fields are not leaked in responses.',
        },
        {
          title: `Write validation schemas for ${entity} creation and updates`,
          desc: `Define Zod schemas validating ${e} title length, dates, priority and payloads.`,
          cat: 'VALIDATION',
          files: [`src/validators/${e}.validator.ts`],
          changes: `Add create${entity}Schema and update${entity}Schema`,
          reasoning: 'Enforces strict domain constraints before persistence.',
        },
        {
          title: `Write validation schemas for ${secondary} entity`,
          desc: `Validate ${s} configuration, color codes, thresholds and parent associations.`,
          cat: 'VALIDATION',
          files: [`src/validators/${s}.validator.ts`],
          changes: `Add create${secondary}Schema with regex and bounds validation`,
          reasoning: 'Prevents invalid categorization structures.',
        },
        {
          title: 'Add database transaction manager helper',
          desc: 'Wrap multi-step database operations in atomic Prisma transactions.',
          cat: 'FEATURE',
          files: ['src/lib/transaction.ts'],
          changes: 'Add runInTransaction helper for rollback on failure',
          reasoning: 'Preserves relational data consistency during compound operations.',
        },
        {
          title: `Write integration tests for ${entity} repository queries`,
          desc: `Test database CRUD operations, foreign key constraints and cascading deletes.`,
          cat: 'TEST',
          files: [`tests/repositories/${e}.repository.test.ts`],
          changes: `Add integration test cases for ${entity}Repository methods`,
          reasoning: 'Validates database constraints and query accuracy.',
        },
        {
          title: 'Document database schema entity relationship diagram',
          desc: 'Add Markdown diagram showing table relations, cardinality and indexed fields.',
          cat: 'DOCS',
          files: ['docs/DATABASE_SCHEMA.md'],
          changes: 'Write mermaid diagram detailing User, Entity and Secondary models',
          reasoning: 'Provides visual reference for engineering team and onboarding.',
        },
      ],

      // Default day generator
      default: [
        {
          title: `Implement ${entity} business service logic step ${commitIndex}`,
          desc: `Execute domain logic step ${commitIndex} for ${entity} processing and workflow.`,
          cat: 'FEATURE',
          files: [`src/services/${e}.service.ts`],
          changes: `Implement calculation and state transition methods for ${e}`,
          reasoning: 'Drives autonomous business capability progress.',
        },
      ],
    };

    // Use specific plan if mapped, or build rich context-driven task
    if (dayMap[day] && dayMap[day][commitIndex - 1]) {
      return dayMap[day][commitIndex - 1];
    }

    // Dynamic procedural generator for days 4 to 20
    return this.generateProceduralTask(day, commitIndex, entity, secondary, service);
  }

  private generateProceduralTask(
    day: number,
    commitIndex: number,
    entity: string,
    secondary: string,
    service: string
  ) {
    const e = entity.toLowerCase();
    const s = secondary.toLowerCase();

    // Map categories across the 15 commits of each day
    const commitArchetypes = [
      { cat: 'DATABASE_MODEL', suffix: 'data model definition and schema refinement' },
      { cat: 'VALIDATION', suffix: 'payload validation schemas and domain rules' },
      { cat: 'FEATURE', suffix: 'core business logic implementation' },
      { cat: 'BACKEND_API', suffix: 'REST API controller endpoint' },
      { cat: 'TEST', suffix: 'automated unit and integration test suite' },
      { cat: 'COMPONENT', suffix: 'modular UI component structure' },
      { cat: 'UI', suffix: 'interactive user interface view styling' },
      { cat: 'AUTH', suffix: 'permission guards and access verification' },
      { cat: 'AI_FEATURE', suffix: 'AI intelligence enhancement and heuristics' },
      { cat: 'ERROR_HANDLING', suffix: 'graceful failure recovery and validation alerts' },
      { cat: 'PERFORMANCE', suffix: 'caching layer and query optimization' },
      { cat: 'REFACTOR', suffix: 'code modularization and interface cleanup' },
      { cat: 'DOCS', suffix: 'API documentation and developer guide update' },
      { cat: 'DEPLOYMENT', suffix: 'operational configuration and telemetry checks' },
      { cat: 'BUG_FIX', suffix: 'edge-case boundary condition hardening' },
    ];

    const archetype = commitArchetypes[(commitIndex - 1) % commitArchetypes.length];
    const stepLabel = `Part ${commitIndex}/15`;

    let title = '';
    let desc = '';
    let files: string[] = [];
    let changes = '';
    let reasoning = '';

    switch (archetype.cat) {
      case 'DATABASE_MODEL':
        title = `Day ${day} (${stepLabel}): Update ${entity} persistence model and relations`;
        desc = `Refine database column structures, constraints and indexed fields for day ${day} features.`;
        files = ['prisma/schema.prisma', `src/models/${e}.model.ts`];
        changes = `Add extended metadata fields and indexing for ${e}`;
        reasoning = 'Ensures database storage accommodates new domain parameters.';
        break;
      case 'VALIDATION':
        title = `Day ${day} (${stepLabel}): Add input validation and constraint rules for ${entity}`;
        desc = `Define Zod schemas to validate incoming payloads and boundary requirements.`;
        files = [`src/validators/${e}.validator.ts`];
        changes = `Implement strict type checks and custom validation rules for ${e}`;
        reasoning = 'Rejects invalid client requests before processing.';
        break;
      case 'FEATURE':
        title = `Day ${day} (${stepLabel}): Implement ${service} domain operation for ${entity}`;
        desc = `Add business logic calculations, state transitions and event triggers.`;
        files = [`src/services/${service.toLowerCase()}.ts`];
        changes = `Implement execute${entity}Workflow logic and state machines`;
        reasoning = 'Core computational functionality required by application users.';
        break;
      case 'BACKEND_API':
        title = `Day ${day} (${stepLabel}): Create /api/${e}s endpoint route and controller`;
        desc = `Expose REST endpoint with request parameter handling, authentication and status codes.`;
        files = [`src/controllers/${e}.controller.ts`, `src/routes/${e}.routes.ts`];
        changes = `Mount endpoint action with async handler and response serializer`;
        reasoning = 'Provides programmatic API interface for client applications.';
        break;
      case 'TEST':
        title = `Day ${day} (${stepLabel}): Add automated tests for ${entity} functionality`;
        desc = `Write test assertions covering happy path, failure conditions and boundary edge cases.`;
        files = [`tests/${e}.test.ts`];
        changes = `Add test cases verifying correct response codes and data integrity`;
        reasoning = 'Guarantees regression prevention and verify code correctness.';
        break;
      case 'COMPONENT':
        title = `Day ${day} (${stepLabel}): Create ${entity} UI card and display component`;
        desc = `Build reusable React component with TypeScript props, icons and responsive layouts.`;
        files = [`client/src/components/${entity}Card.tsx`];
        changes = `Implement ${entity}Card with status badges and action handlers`;
        reasoning = 'Modular UI building block for dashboards and list views.';
        break;
      case 'UI':
        title = `Day ${day} (${stepLabel}): Implement ${entity} management view and interactive styling`;
        desc = `Create page layout with search filters, action buttons and empty states.`;
        files = [`client/src/pages/${entity}Page.tsx`];
        changes = `Build responsive view with dark glass cards and action triggers`;
        reasoning = 'Provides user-facing interface to interact with domain features.';
        break;
      case 'AUTH':
        title = `Day ${day} (${stepLabel}): Implement role-based access control for ${entity} actions`;
        desc = `Enforce permission checks verifying user ownership before data mutation.`;
        files = [`src/middleware/rbacGuard.ts`];
        changes = `Add verifyOwnership middleware inspecting target ${e} records`;
        reasoning = 'Prevents unauthorized users from modifying external resources.';
        break;
      case 'AI_FEATURE':
        title = `Day ${day} (${stepLabel}): Implement AI reasoning heuristics for ${entity} generation`;
        desc = `Construct intelligent prompt template and recommendation engine for ${e}.`;
        files = [`src/services/ai${entity}.service.ts`];
        changes = `Add generateIntelligent${entity}Suggestions using contextual scoring`;
        reasoning = 'Delivers core AI value proposition described in project goals.';
        break;
      case 'ERROR_HANDLING':
        title = `Day ${day} (${stepLabel}): Add resilient error handling and recovery for ${entity}`;
        desc = `Handle unexpected network timeouts, database deadlocks and invalid inputs gracefully.`;
        files = [`src/utils/retryHandler.ts`];
        changes = `Wrap asynchronous calls with exponential backoff retry logic`;
        reasoning = 'Ensures system stability during high load or transient disruptions.';
        break;
      case 'PERFORMANCE':
        title = `Day ${day} (${stepLabel}): Optimize ${entity} query execution and memory caching`;
        desc = `Introduce in-memory caching and optimized database projection queries.`;
        files = [`src/lib/cache.ts`];
        changes = `Cache frequent ${e} lookups with TTL expiration`;
        reasoning = 'Reduces database query latency and improves response speeds.';
        break;
      case 'REFACTOR':
        title = `Day ${day} (${stepLabel}): Modularize ${entity} utility helpers and shared types`;
        desc = `Extract common formatting helpers, date calculations and constants.`;
        files = [`src/utils/${e}Helpers.ts`];
        changes = `Refactor duplicate logic into reusable utility functions`;
        reasoning = 'Improves maintainability and adheres to clean architecture principles.';
        break;
      case 'DOCS':
        title = `Day ${day} (${stepLabel}): Document ${entity} API specifications and schemas`;
        desc = `Document request/response contracts, header requirements and sample payloads.`;
        files = [`docs/api/${e}.md`];
        changes = `Write Markdown specification for all ${e} endpoint operations`;
        reasoning = 'Enables external developers and frontend teams to integrate easily.';
        break;
      case 'DEPLOYMENT':
        title = `Day ${day} (${stepLabel}): Add health probes and deployment config for ${entity}`;
        desc = `Update container configurations, environment parameters and readiness probes.`;
        files = ['docker-compose.yml', 'src/config/runtime.ts'];
        changes = `Configure runtime resource limits and health check parameters`;
        reasoning = 'Ensures continuous deployment environments stay healthy.';
        break;
      case 'BUG_FIX':
      default:
        title = `Day ${day} (${stepLabel}): Fix boundary conditions and validation for ${entity}`;
        desc = `Address potential null pointer dereferences, timestamp mismatches and edge cases.`;
        files = [`src/services/${e}.service.ts`];
        changes = `Add defensive guards and null-checks on optional ${e} parameters`;
        reasoning = 'Hardens software quality against unexpected client inputs.';
        break;
    }

    return {
      title,
      description: desc,
      category: archetype.cat,
      targetFiles: files,
      expectedChanges: changes,
      reasoning,
    };
  }

  private synthesizeAnalysis(name: string, description: string): ProjectAnalysis {
    const text = (name + ' ' + description).toLowerCase();

    return {
      applicationType: 'Full-Stack Autonomous Cloud Application',
      frontendRequirements: [
        'React 18 single-page application with TypeScript',
        'Tailwind CSS dark developer UI (Linear/GitHub/Vercel design system)',
        'React Router navigation with protected routes',
        'Interactive dashboards, charts, status cards and timeline views',
        'Real-time WebSocket / SSE connection for live status streaming',
      ],
      backendRequirements: [
        'Node.js REST API with Express and TypeScript',
        'PostgreSQL database persistence with Prisma ORM',
        'JWT token authentication with bcrypt password hashing',
        'Modular controllers, services, repositories and validators',
        'Structured logging and centralized error handling middleware',
      ],
      databaseRequirements: [
        'Relational data models with foreign key constraints',
        'Optimized composite indexes on high-frequency query paths',
        'Automated database migrations and seeders',
        'Atomic transaction support for compound updates',
      ],
      authenticationRequirements: [
        'User registration and login endpoints',
        'Bcrypt password encryption with salt rounds',
        'Stateless JWT access and refresh tokens',
        'Role-Based Access Control (RBAC) permission guards',
      ],
      apis: [
        '/api/auth/register, /api/auth/login, /api/auth/me',
        '/api/dashboard/stats, /api/analytics',
        `/api/${name.toLowerCase().replace(/[^a-z0-9]/g, '')}/items`,
        '/api/health, /api/system/status',
      ],
      aiFeatures: [
        'Contextual recommendations and automated synthesis engine',
        'Intelligent pattern analysis and schedule/workflow generation',
        'Automated error analysis and self-healing logic',
      ],
      majorFeatures: [
        'End-to-end domain entity management and lifecycle tracking',
        'Real-time execution monitoring and activity timelines',
        'Interactive analytics charts and summary KPI counters',
        'Comprehensive testing suite and containerized deployment',
      ],
      uiPages: [
        'Dashboard & Key Metrics',
        'Project Creation & Configuration',
        'Domain Entity Manager & Forms',
        'Activity Timeline & Commit History',
        'Real-Time Execution Logs Console',
        'System Settings & Integrations',
      ],
      components: [
        'Navigation Sidebar and Top Header',
        'Metric KPI Cards and Progress Rings',
        'Terminal-Style Real-Time Console',
        'Interactive Data Tables with Search & Filters',
        'Git Commit Diff Inspector Modal',
        'Status Badges and Loading Skeletons',
      ],
      infrastructure: [
        'Docker containerization with multi-stage builds',
        'GitHub Actions CI/CD automated workflow',
        'Environment configuration validation via Zod',
      ],
      testingRequirements: [
        'Unit tests for domain calculation services',
        'Integration tests for REST API endpoints',
        'Component verification and sanity tests',
      ],
      deploymentRequirements: [
        'Containerized production image',
        'Environment variable security enforcement',
        'Graceful shutdown signal handlers (SIGTERM/SIGINT)',
      ],
      architectureNotes:
        'The application employs clean layered architecture: Transport Layer (Controllers/Routes) -> Business Layer (Services) -> Persistence Layer (Repositories/Prisma) -> Storage (Database). Every commit delivers a tangible, functional, non-empty code change with full syntax validation.',
    };
  }

  private async queryGeminiForAnalysis(name: string, description: string, apiKey: string): Promise<ProjectAnalysis | null> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Analyze this software project:
Project Name: ${name}
Description: ${description}

Return a valid JSON object matching this schema:
{
  "applicationType": "string",
  "frontendRequirements": ["strings"],
  "backendRequirements": ["strings"],
  "databaseRequirements": ["strings"],
  "authenticationRequirements": ["strings"],
  "apis": ["strings"],
  "aiFeatures": ["strings"],
  "majorFeatures": ["strings"],
  "uiPages": ["strings"],
  "components": ["strings"],
  "infrastructure": ["strings"],
  "testingRequirements": ["strings"],
  "deploymentRequirements": ["strings"],
  "architectureNotes": "string"
}`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) return null;
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return JSON.parse(text) as ProjectAnalysis;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const aiPlannerService = new AIPlannerService();
