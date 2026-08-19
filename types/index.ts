// ────────────────────────────────────────────────────────────────────────────
// Auth
// ────────────────────────────────────────────────────────────────────────────

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export type UserRole = "super_admin" | "user";

export interface UserResponse {
  id: string;
  username: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_approved: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface ConsentResponse {
  id: string;
  user_id: string;
  consent_type: "terms" | "privacy" | "marketing" | "analytics";
  accepted: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Projects
// ────────────────────────────────────────────────────────────────────────────

export interface ProjectConfig {
  assistant_name: string | null;
  company_name: string | null;
  assistant_role: string | null;
  assistant_tone: string | null;
  assistant_avatar: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_website: string | null;
  site_actions: ProjectSiteAction[];
  default_language: string | null;
  fallback_behavior: string | null;
  enable_web_search: boolean;
  model: string | null;
  temperature: number | null;
  max_tokens: number | null;
  max_context_messages: number | null;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  api_key: string | null;
  agent_token?: string | null;
  agent_token_masked?: string | null;
  api_key_masked: string;
  is_active: boolean;
  owner_id: string;
  owner_username: string;
  created_at: string;
  updated_at: string;
  config: ProjectConfig | null;
}

export interface ProjectSiteAction {
  label: string;
  url: string;
  description?: string | null;
  action_type?: string | null;
  tags: string[];
  module_ids: string[];
  priority: number;
  enabled: boolean;
}

export type ProjectLLMUsage =
  | "final_response"
  | "fast_agents"
  | "vanna_sql"
  | "semantic_critic";
export type ProjectLLMProviderType = "openai_compatible" | "gemini" | "ollama";

export interface ProjectLLMProvider {
  id: string | null;
  project_id?: string | null;
  usage: ProjectLLMUsage;
  priority: number;
  enabled: boolean;
  provider_type: ProjectLLMProviderType;
  name: string;
  url: string | null;
  model: string;
  has_api_key: boolean;
  temperature: number | null;
  max_tokens: number | null;
  timeout_seconds: number;
  max_concurrency: number | null;
  max_project_concurrency: number | null;
  queue_timeout_ms: number | null;
  input_cost_per_million_usd: number | null;
  output_cost_per_million_usd: number | null;
  source?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProjectLLMSettingsResponse {
  project_id: string;
  uses_project_settings: boolean;
  providers: ProjectLLMProvider[];
  defaults: ProjectLLMProvider[];
}

export interface UpsertProjectLLMProviderPayload {
  id?: string | null;
  usage: ProjectLLMUsage;
  priority: number;
  enabled: boolean;
  provider_type: ProjectLLMProviderType;
  name: string;
  url?: string | null;
  model: string;
  api_key?: string | null;
  clear_api_key?: boolean;
  temperature?: number | null;
  max_tokens?: number | null;
  timeout_seconds: number;
  max_concurrency?: number | null;
  max_project_concurrency?: number | null;
  queue_timeout_ms?: number | null;
  input_cost_per_million_usd?: number | null;
  output_cost_per_million_usd?: number | null;
}

export interface UpsertProjectLLMSettingsPayload {
  providers: UpsertProjectLLMProviderPayload[];
}

export interface ProjectLLMTestResponse {
  ok: boolean;
  provider: string;
  response: string;
}

export interface ProjectListResponse {
  projects: Project[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ProjectSetupSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  api_key_masked: string;
  agent_token_masked: string | null;
  agent_token_active: boolean;
  agent_token_rotated_at: string | null;
  has_db_config: boolean;
  connection_mode: "direct" | "local_agent" | null;
  db_enabled: boolean;
  db_consent: boolean;
  db_type: string | null;
  db_host: string | null;
  db_port: number | null;
  db_name: string | null;
  db_ssl_mode: string | null;
  agent_base_url: string | null;
  db_last_tested_at: string | null;
  db_last_test_success: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProjectSetupListResponse {
  projects: ProjectSetupSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface CreateProjectPayload {
  name: string;
  slug?: string;
  description?: string;
  assistant_name?: string;
  company_name?: string;
  assistant_role?: string;
  assistant_tone?: string;
  max_context_messages?: number;
  contact_email?: string;
  contact_phone?: string;
  contact_website?: string;
}

export type UpdateProjectPayload = Partial<CreateProjectPayload> & {
  site_actions?: ProjectSiteAction[];
};

export interface RotateKeyResponse {
  project_id: string;
  new_api_key: string;
  warning: string;
  rotated_at: string;
}

export interface RevealKeyResponse {
  project_id: string;
  api_key: string;
  warning: string;
}

export interface RevealAgentTokenResponse {
  project_id: string;
  agent_token: string;
  token_prefix: string;
  warning: string;
}

// ────────────────────────────────────────────────────────────────────────────
// RAG Files
// ────────────────────────────────────────────────────────────────────────────

export type RagFileStatus = "processing" | "ready" | "error";

export interface RagFile {
  id: string;
  project_id: string;
  filename: string;
  file_type: string;
  size_bytes: number;
  status: RagFileStatus;
  chunks_count: number | null;
  error_message: string | null;
  uploaded_at: string;
}

export interface RagFileContent {
  filename: string;
  content: string;
  size_bytes: number;
  editable: boolean;
}

export interface RagFileUpdateResponse {
  status: string;
  filename: string;
  size_bytes: number;
  rebuild: {
    project_id: string;
    files_processed: number;
    documents_indexed: number;
    vector_chunks_indexed: number;
    vector_error: string | null;
    errors: { file: string; error: string }[];
  } | null;
}

export type ProjectCacheScope = "all" | "responses" | "rag" | "db_followup";

export interface ProjectCacheEntry {
  key: string;
  scope: string;
  ttl_seconds: number | null;
  value_type: string;
  size_bytes: number;
  value: unknown;
  preview: string;
}

export interface ProjectCacheListResponse {
  enabled: boolean;
  project_id: string;
  total: number;
  entries: ProjectCacheEntry[];
}

// ────────────────────────────────────────────────────────────────────────────
// Conversations & Messages
// ────────────────────────────────────────────────────────────────────────────

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  project_id: string;
  session_id: string | null;
  user_id: string | null;
  username: string | null;
  created_at: string;
  updated_at?: string;
  message_count: number;
}

export interface ConversationDetail extends Conversation {
  messages: ConversationMessage[];
}

export interface ConversationListResponse {
  conversations: Conversation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Chat
// ────────────────────────────────────────────────────────────────────────────

export interface NLUResult {
  primary_intent: string;
  confidence: number;
  should_use_llm: boolean;
  cached_response?: string | null;
  language: string;
  route_hint: string;
  recommended_sources: string[];
  entities: Record<string, unknown>;
  requires_context: boolean;
  cacheable: boolean;
  latency_ms: number;
}

export interface RecoveryMetadata {
  used: boolean;
  reason: string;
  actions: string[];
}

export interface ChatStreamChunk {
  content?: string;
  done?: boolean;
  error?: string;
  conversation_id?: string;
  source_type?: string;
  nlu?: NLUResult;
  recovery?: RecoveryMetadata;
  cached?: boolean;
  response_time?: number;
}

export interface ChatResponseDataRecordV1 {
  type: "database_rows" | "document_evidence" | string;
  source?: string;
  source_category?: string;
  dataset?: string | null;
  columns?: string[];
  rows?: Array<Record<string, unknown>>;
  row_count?: number;
  text?: string;
}

export interface ChatResponseCatalogItemV1 {
  name: string;
  images: string[];
  description?: string;
  price?: string;
  currency?: string;
  url?: string;
  availability?: string;
}

export interface ChatResponseCatalogV1 {
  kind: "products";
  items: ChatResponseCatalogItemV1[];
}

export interface ChatResponseRecommendationV1 {
  id?: string;
  label: string;
  priority?: string;
  reason?: string;
  compatible_with?: string[];
  output_type?: string;
}

export interface ChatResponseActionV1 {
  action_id?: string;
  label: string;
  url?: string;
  action_type?: string;
  confirmation_required?: boolean;
  description?: string;
}

export interface ChatResponsePayloadV1 {
  schema_version: "chat_response_payload.v1";
  response: string;
  source_category?: string;
  data: {
    records: ChatResponseDataRecordV1[];
    record_count?: number;
    catalog?: ChatResponseCatalogV1;
  };
  recommendations: ChatResponseRecommendationV1[];
  actions: ChatResponseActionV1[];
  missing_information?: string[];
}

export type PublicChatOutcome =
  | "answer"
  | "recommendation"
  | "hybrid"
  | "action"
  | "clarification"
  | "out_of_scope"
  | "refusal";

export interface PublicChatRecommendationV2 {
  capability_id: string;
  name: string;
  description: string;
  reasons: string[];
  optional: boolean;
}

export interface PublicChatActionV2 {
  action_id: string;
  label: string;
  action_type: string;
  url: string;
  confirmation_required: boolean;
  action_instance_id: string | null;
  expires_at: string | null;
  confirmation_token: string | null;
  status: "ready" | "confirmation_required";
}

export interface PublicChatClarificationV2 {
  set_id: string;
  memory_revision: number;
  reason: string;
  questions: string[];
  question_ids: string[];
}

export interface PublicChatSourceV2 {
  citation_id: string;
  source_type: "db" | "document" | "external" | "catalog";
  label: string;
  updated_at: string | null;
}

export interface PublicChatResponseV2 {
  schema_version: "chat.public.v2";
  conversation_id: string;
  user_message_id: string;
  assistant_message: {
    id: string;
    role: "assistant";
    content: string;
    created_at: string;
  };
  outcome: PublicChatOutcome;
  recommendations: PublicChatRecommendationV2[];
  actions: PublicChatActionV2[];
  clarification: PublicChatClarificationV2 | null;
  sources: PublicChatSourceV2[];
  explanation: {
    summary: string;
    selected_reasons: string[];
    limitations: string[];
  } | null;
  quality: {
    status:
      | "accepted"
      | "confirmation_required"
      | "clarification"
      | "limited"
      | "refused";
    reviewed: true;
  };
  trace_id: string;
}

export interface PublicConversationMessageV2 extends ConversationMessage {
  schema_version: "conversation.message.public.v2";
  public_response: PublicChatResponseV2 | null;
}

export interface PublicConversationMessagesV2 {
  schema_version: "conversation.messages.public.v2";
  conversation_id: string;
  messages: PublicConversationMessageV2[];
}

export type PublicChatSseEventV2 =
  | {
      schema_version: "chat.sse.v2";
      event: "progress";
      trace_id: string;
      step: "planning" | "retrieving" | "composing" | "validating";
    }
  | {
      schema_version: "chat.sse.v2";
      event: "delta";
      trace_id: string;
      assistant_message_id: string;
      sequence: number;
      content: string;
    }
  | {
      schema_version: "chat.sse.v2";
      event: "final";
      trace_id: string;
      response: PublicChatResponseV2;
    }
  | {
      schema_version: "chat.sse.v2";
      event: "error";
      trace_id: string;
      code: "temporarily_unavailable" | "invalid_request" | "quality_rejected";
      retryable: boolean;
    };

// ────────────────────────────────────────────────────────────────────────────
// Knowledge Sources
// ────────────────────────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT";

export interface KnowledgeSource {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  url: string;
  method: HttpMethod;
  headers: Record<string, string> | null;
  api_key: string | null;
  payload: Record<string, unknown> | null;
  response_path: string | null;
  text_field: string | null;
  timeout: number;
  is_enabled: boolean;
  scope_keywords: string[];
  last_tested_at: string | null;
  last_test_success: boolean | null;
  last_test_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSourceListResponse {
  project_id: string;
  total: number;
  sources: KnowledgeSource[];
}

export interface CreateKnowledgeSourcePayload {
  name: string;
  description?: string;
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  api_key?: string;
  payload?: Record<string, unknown>;
  response_path?: string;
  text_field?: string;
  timeout?: number;
  is_enabled?: boolean;
  scope_keywords?: string[];
}

export type UpdateKnowledgeSourcePayload = Partial<CreateKnowledgeSourcePayload>;

export interface KnowledgeSourceTestResult {
  success: boolean;
  status_code: number | null;
  response_preview: string | null;
  error: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Analytics
// ────────────────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  total_conversations: number;
  total_messages: number;
  unique_users: number;
  avg_response_time_ms: number;
  avg_messages_per_conversation: number;
  satisfaction_rate: number;
  rag_usage_rate: number;
  total_tokens_used?: number;
}

export interface AnalyticsTrend {
  date: string;
  conversations: number;
  messages: number;
  avg_response_time_ms: number;
  tokens_used?: number;
  satisfaction_rate?: number;
}

export interface TopQuestion {
  question: string;
  count: number;
  avg_satisfaction?: number;
  avg_response_time_ms?: number;
  last_asked?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Project External Database Config
// ────────────────────────────────────────────────────────────────────────────

export type ProjectDatabaseType = "postgres" | "mysql";
export type ProjectConnectionMode = "direct" | "local_agent" | "ssh_tunnel";
export type ProjectDatabaseSslMode =
  | "disable"
  | "allow"
  | "prefer"
  | "require"
  | "verify-ca"
  | "verify-full";

export interface ProjectDatabaseConfig {
  project_id: string;
  connection_mode: ProjectConnectionMode;
  db_type: ProjectDatabaseType;
  host: string | null;
  port: number | null;
  db_name: string | null;
  db_user: string | null;
  ssl_mode: ProjectDatabaseSslMode;
  agent_base_url: string | null;
  ssh_host?: string | null;
  ssh_port?: number | null;
  ssh_user?: string | null;
  ssh_auth_method?: "password" | "private_key" | null;
  ssh_remote_host?: string | null;
  ssh_remote_port?: number | null;
  is_enabled: boolean;
  consent_share_data: boolean;
  consent_at: string | null;
  consent_version: string | null;
  include_tables: string[];
  exclude_tables: string[];
  connect_timeout_seconds: number;
  statement_timeout_ms: number;
  max_rows: number;
  last_tested_at: string | null;
  last_test_success: boolean | null;
  last_test_error: string | null;
  has_password: boolean;
  has_agent_token: boolean;
  has_ssh_password?: boolean;
  has_ssh_private_key?: boolean;
}

export interface UpsertProjectDatabaseConfigPayload {
  connection_mode: ProjectConnectionMode;
  db_type: ProjectDatabaseType;
  host?: string;
  port?: number;
  db_name?: string;
  db_user?: string;
  db_password?: string;
  ssl_mode: ProjectDatabaseSslMode;
  agent_base_url?: string;
  agent_token?: string;
  ssh_host?: string;
  ssh_port?: number;
  ssh_user?: string;
  ssh_auth_method?: "password" | "private_key";
  ssh_password?: string;
  ssh_private_key?: string;
  ssh_private_key_passphrase?: string;
  ssh_remote_host?: string;
  ssh_remote_port?: number;
  is_enabled: boolean;
  consent_share_data: boolean;
  consent_version: string;
  include_tables: string[];
  exclude_tables: string[];
  connect_timeout_seconds: number;
  statement_timeout_ms: number;
  max_rows: number;
}

export interface ProjectDatabaseTestResult {
  success: boolean;
  database: string;
  user: string;
  tables_preview: string[];
}

export type ProjectSqlProvider = "heuristic" | "vanna" | "hybrid";
export type ProjectSqlVannaLlmProvider = "ollama" | "openai_compatible";

export interface ProjectSqlAgentSettings {
  id: string;
  project_id: string;
  is_enabled: boolean;
  shadow_mode: boolean;
  provider: ProjectSqlProvider;
  model_name: string | null;
  temperature: number | null;
  vanna_llm_provider: ProjectSqlVannaLlmProvider;
  vanna_llm_url: string | null;
  has_vanna_llm_api_key: boolean;
  vanna_llm_timeout_seconds: number;
  max_context_tables: number;
  max_examples: number;
  auto_refresh_schema: boolean;
  schema_cache_ttl_seconds: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UpsertProjectSqlAgentSettingsPayload {
  is_enabled: boolean;
  shadow_mode: boolean;
  provider: ProjectSqlProvider;
  model_name?: string | null;
  temperature?: number | null;
  vanna_llm_provider: ProjectSqlVannaLlmProvider;
  vanna_llm_url?: string | null;
  vanna_llm_api_key?: string | null;
  vanna_llm_timeout_seconds: number;
  max_context_tables: number;
  max_examples: number;
  auto_refresh_schema: boolean;
  schema_cache_ttl_seconds: number;
}

export interface ProjectSqlAlias {
  id: string;
  project_id: string;
  alias: string;
  target_type: "table" | "column" | "value";
  target_name: string;
  table_name: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateProjectSqlAliasPayload {
  alias: string;
  target_type: "table" | "column" | "value";
  target_name: string;
  table_name?: string;
  notes?: string;
}

export interface ProjectSqlAliasListResponse {
  aliases: ProjectSqlAlias[];
  total: number;
}

export interface ProjectSqlExample {
  id: string;
  project_id: string;
  question: string;
  sql_query: string;
  rationale: string | null;
  tables_used: string[];
  tags: string[];
  success_count: number;
  failure_count: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateProjectSqlExamplePayload {
  question: string;
  sql_query: string;
  rationale?: string;
  tables_used: string[];
  tags: string[];
  is_active: boolean;
}

export interface ProjectSqlExampleListResponse {
  examples: ProjectSqlExample[];
  total: number;
}

export interface ProjectSchemaCache {
  project_id: string;
  schema_hash: string | null;
  schema_json: {
    meta?: Record<string, unknown>;
    tables?: Record<
      string,
      {
        all?: string[];
        safe?: string[];
        columns?: Array<{ name: string; data_type?: string | null; is_safe?: boolean }>;
      }
    >;
  };
  source_updated_at: string | null;
  refreshed_at: string | null;
  ttl_seconds: number;
  updated_at: string | null;
}

export interface FailedQuery {
  query: string;
  error_type: string;
  count: number;
  last_occurred: string;
  sample_context?: string;
}

export interface ConversationIssues {
  total_user_messages: number;
  unresolved_messages: number;
  unanswered_messages: number;
  uncertain_responses: number;
  negative_feedbacks: number;
  unresolved_rate: number;
  avg_response_time_ms: number;
  p95_response_time_ms: number;
  recent_errors: FailedQuery[];
}

export interface SatisfactionStats {
  total_feedbacks: number;
  positive_count: number;
  negative_count: number;
  satisfaction_rate: number;
  trend: "improving" | "declining" | "stable";
  by_category: Record<string, number>;
}

export interface CostStats {
  total_tokens_input: number;
  total_tokens_output: number;
  estimated_cost_usd: number;
  cost_by_model: Record<string, number>;
  cost_trend: AnalyticsTrend[];
}

// ────────────────────────────────────────────────────────────────────────────
// Activities
// ────────────────────────────────────────────────────────────────────────────

export type ActivityType =
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "conversation_started"
  | "user_first_message"
  | "file_uploaded"
  | "api_key_rotated"
  | "api_key_revoked";

export interface Activity {
  id: string;
  activity_type: ActivityType | string;
  actor_user_id: string | null;
  actor_username: string | null;
  project_id: string | null;
  project_name: string | null;
  conversation_id: string | null;
  end_user_id: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  message: string;
}

export interface ActivityListResponse {
  activities: Activity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  unread_count: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Support Tickets
// ────────────────────────────────────────────────────────────────────────────

export type TicketStatus = "open" | "in_progress" | "closed";

export interface SupportTicket {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  project_id: string | null;
  status: TicketStatus;
  admin_note: string | null;
  created_at: string;
}

export interface CreateTicketPayload {
  name: string;
  email: string;
  message: string;
  subject?: string;
  project_id?: string;
}

export interface UpdateTicketPayload {
  status: TicketStatus;
  admin_note?: string;
}

export interface SupportContent {
  hero?: { title: string; subtitle: string };
  contact_info?: { email: string; response_time: string };
  faq?: { items: { question: string; answer: string }[] };
}

// ────────────────────────────────────────────────────────────────────────────
// Documentation content (public + admin editable)
// ────────────────────────────────────────────────────────────────────────────

export interface DocumentationHero {
  title: string;
  subtitle: string;
}

export interface DocumentationOverviewModule {
  title: string;
  points: string[];
}

export interface DocumentationOverview {
  title: string;
  intro: string;
  modules: DocumentationOverviewModule[];
}

export interface DocumentationDevCard {
  title: string;
  description: string;
}

export interface DocumentationDev {
  title: string;
  intro: string;
  cards: DocumentationDevCard[];
  integration_steps: string[];
  payload_example: string;
}

export interface DocumentationQaArea {
  area: string;
  checks: string;
}

export interface DocumentationQa {
  title: string;
  intro: string;
  strategy: string[];
  area_checks: DocumentationQaArea[];
}

export interface DocumentationContent {
  hero: DocumentationHero;
  overview: DocumentationOverview;
  dev: DocumentationDev;
  qa: DocumentationQa;
}

// ────────────────────────────────────────────────────────────────────────────
// Workflow — Enums & Sub-contracts
// ────────────────────────────────────────────────────────────────────────────

export type WorkflowRolloutMode = "disabled" | "shadow" | "canary" | "active";
export type CanaryFallbackPolicy = "availability_precommit" | "never";

export interface PlannerBudgets {
  max_external_llm_calls: number;
  max_regenerations: number;
  deadline_ms: number | null;
}

export interface QualityPolicy {
  send_threshold: number;
  regenerate_threshold: number;
  clarify_threshold: number;
  max_regenerations: number;
}

export interface SafetyPolicy {
  expose_source_summaries: boolean;
  expose_explanations: boolean;
  allow_public_sql: boolean;
  allowed_action_hosts: string[];
  allowed_action_query_params: string[];
  allow_action_fragments: boolean;
}

export interface CapabilityDefinition {
  capability_id: string;
  name: string;
  public_description: string;
  capabilities: string[];
  not_capabilities?: string[];
  dependencies?: string[];
  conditional_complements?: string[];
  incompatibilities?: string[];
  clarification_triggers?: string[];
  tags?: string[];
  priority?: number;
  enabled?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Workflow — Settings
// ────────────────────────────────────────────────────────────────────────────

export interface WorkflowSettingsUpsert {
  expected_revision: number;
  is_enabled?: boolean;
  shadow_mode?: boolean;
  shadow_sample_rate?: number;
  allow_host_provider_fallback?: boolean;
  rollout_mode?: WorkflowRolloutMode | null;
  canary_sample_rate?: number;
  canary_epoch?: string | null;
  canary_fallback_policy?: CanaryFallbackPolicy;
  engine_version?: string;
  execution_deadline_ms?: number;
  active_min_canary_runs?: number;
  active_max_failure_rate?: number;
  active_max_p95_latency_ms?: number;
  active_min_average_quality?: number;
  llm_external_window_seconds?: number;
  llm_external_window_limit?: number;
  llm_external_target_per_100_messages?: number;
  max_external_llm_calls?: number;
  max_regenerations?: number;
  planner_deadline_ms?: number | null;
  send_threshold?: number;
  regenerate_threshold?: number;
  clarify_threshold?: number;
  expose_source_summaries?: boolean;
  expose_explanations?: boolean;
  allow_public_sql?: boolean;
  allowed_action_hosts?: string[];
  allowed_action_query_params?: string[];
  allow_action_fragments?: boolean;
}

export interface WorkflowSettings {
  schema_version: string;
  persisted: boolean;
  revision: number;
  is_enabled: boolean;
  shadow_mode: boolean;
  shadow_sample_rate: number;
  allow_host_provider_fallback: boolean;
  rollout_mode: WorkflowRolloutMode;
  canary_sample_rate: number;
  canary_epoch: string;
  canary_fallback_policy: CanaryFallbackPolicy;
  engine_version: string;
  execution_deadline_ms: number;
  active_min_canary_runs: number;
  active_max_failure_rate: number;
  active_max_p95_latency_ms: number;
  active_min_average_quality: number;
  current_candidate_id: string | null;
  evaluation_window_id: string | null;
  active_certification_id: string | null;
  active_runtime_enabled: boolean;
  rollout_generation: number;
  llm_external_window_seconds: number;
  llm_external_window_limit: number;
  llm_external_target_per_100_messages: number;
  planner_budgets: PlannerBudgets;
  quality_policy: QualityPolicy;
  safety_policy: SafetyPolicy;
  updated_at: string | null;
}

export interface CapabilityCatalog {
  schema_version: string;
  revision: number;
  catalog_hash: string;
  is_enabled: boolean;
  capabilities: CapabilityDefinition[];
  updated_at: string;
}

export interface CapabilityCatalogUpsert {
  expected_revision: number;
  is_enabled?: boolean;
  capabilities: CapabilityDefinition[];
}

export interface ProjectWorkflowConfiguration {
  project_id: string;
  settings: WorkflowSettings;
  capability_catalog: CapabilityCatalog | null;
}

export type WorkflowReadinessStatus = "ready" | "degraded" | "blocked";
export type WorkflowCheckStatus = "ready" | "warning" | "blocked";

export interface WorkflowReadinessCheck {
  key: string;
  status: WorkflowCheckStatus;
  message: string;
  action: string | null;
}

export interface WorkflowRecentOutcome {
  status: string;
  delivery: string;
  reason_code: string;
  duration_ms: number;
  created_at: string;
}

export interface WorkflowReadiness {
  schema_version: "workflow_readiness.v1";
  project_id: string;
  status: WorkflowReadinessStatus;
  can_accept_public_v2: boolean;
  rollout_mode: WorkflowRolloutMode;
  canary_sample_rate: number;
  source_ready_count: number;
  source_count: number;
  capability_count: number;
  checks: WorkflowReadinessCheck[];
  recent_outcomes: WorkflowRecentOutcome[];
  checked_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Workflow — Certification Pipeline
// ────────────────────────────────────────────────────────────────────────────

export interface WorkflowCandidateManifest {
  schema_version: string;
  project_id: string;
  artifact_digest: string;
  workflow_contract_version: string;
  engine_version: string;
  prompt_bundle_hash: string;
  provider_bundle_hash: string;
  settings_hash: string;
  project_config_hash: string;
  capability_catalog_hash: string;
  action_catalog_hash: string;
}

export interface WorkflowCandidate {
  candidate_id: string;
  project_id: string;
  candidate_hash: string;
  manifest: WorkflowCandidateManifest;
  created_by: string | null;
  created_at: string;
}

export interface WorkflowCandidateCreate {
  expected_revision: number;
}

export interface WorkflowEvaluationPolicy {
  policy_id: string;
  project_id: string;
  policy_hash: string;
  policy: Record<string, unknown>;
  created_by: string | null;
  sealed_at: string;
  created_at: string;
}

export interface WorkflowEvaluationPolicyCreate {
  expected_revision: number;
  policy: Record<string, unknown>;
}

export interface WorkflowEvaluationWindow {
  evaluation_window_id: string;
  project_id: string;
  candidate_id: string;
  candidate_hash: string;
  policy_id: string;
  campaign_id: string;
  stage_index: number;
  canary_sample_rate: number;
  settings_revision: number;
  canary_epoch: string;
  engine_version: string;
  starts_at: string;
  not_before: string;
  ends_at: string;
  created_by: string | null;
  created_at: string;
}

export interface WorkflowEvaluationWindowCreate {
  expected_revision: number;
  candidate_id: string;
  policy_id: string;
}

export interface WorkflowCertifiedPromotion {
  expected_revision: number;
}

export interface WorkflowCertification {
  certification_id: string;
  project_id: string;
  evaluation_window_id: string;
  candidate_id: string;
  policy_id: string;
  candidate_hash: string;
  policy_hash: string;
  report_hash: string;
  certification_hash: string;
  cutoff_at: string;
  certified_at: string;
  expires_at: string;
}

export interface WorkflowLegacyRetirement {
  retirement_id: string;
  project_id: string;
  certification_id: string;
  candidate_id: string;
  report_hash: string;
  retired_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Workflow — Evaluation & Observability
// ────────────────────────────────────────────────────────────────────────────

export interface CertifiedEvaluationMetrics {
  selected_runs: number;
  independent_runs: number;
  terminal_runs: number;
  pending_runs: number;
  unique_conversations: number;
  failed_runs: number;
  failure_rate: number;
  failure_rate_upper_bound: number;
  p95_latency_ms: number;
  average_quality: number;
  quality_coverage: number;
  external_calls_per_message: number;
  estimated_cost_per_100_messages: number;
  provider_failure_rate: number;
  provider_failure_rate_upper_bound: number;
  runtime_denial_rate: number;
  feedback_coverage: number;
  negative_feedback_rate: number;
  negative_feedback_rate_upper_bound: number;
}

export interface CertifiedEvaluationReport {
  schema_version: string;
  project_id: string;
  evaluation_window_id: string;
  candidate_id: string;
  candidate_hash: string;
  policy_id: string;
  policy_hash: string;
  starts_at: string;
  not_before: string;
  ends_at: string;
  cutoff_at: string;
  eligible: boolean;
  failed_checks: string[];
  metrics: CertifiedEvaluationMetrics;
  strata: Record<string, unknown>[];
}

export interface ProviderRuntimeEventMetrics {
  count: number;
  mean_wait_ms: number;
  max_wait_ms: number;
}

export interface LLMBudgetObservability {
  message_count: number;
  external_attempt_count: number;
  external_success_count: number;
  external_failure_count: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  p95_latency_ms: number;
  runtime_events: Record<string, ProviderRuntimeEventMetrics>;
  external_calls_per_message: number;
}

export interface WorkflowEngineEvaluation {
  authoritative: false;
  project_id: string;
  eligible_for_active: boolean;
  failed_checks: string[];
  run_count: number;
  failure_rate: number;
  p95_latency_ms: number;
  average_quality: number;
  quality_run_count: number;
  policy: Record<string, number>;
  llm_budget: LLMBudgetObservability;
}

export interface AgentRun {
  id: string;
  workflow_trace_id: string;
  conversation_id: string | null;
  user_message_id: string | null;
  snapshot_hash: string;
  workflow_version: string;
  run_mode: string;
  status: string;
  decision_path: string;
  provider: string | null;
  input_hash: string;
  intent_probabilities: Record<string, unknown> | null;
  plan_summary: Record<string, unknown> | null;
  legacy_summary: Record<string, unknown>;
  comparison: Record<string, unknown>;
  error_code: string | null;
  duration_ms: number;
  llm_call_count: number;
  created_at: string;
}

export interface WorkflowRolloutEvent {
  event_id: string;
  from_mode: WorkflowRolloutMode;
  to_mode: WorkflowRolloutMode;
  reason_code: string;
  settings_revision_before: number;
  settings_revision_after: number;
  rollout_generation: number;
  evidence: Record<string, unknown>;
  created_at: string;
}

export interface WorkflowCertificationSummary {
  certification_id: string;
  evaluation_window_id: string;
  candidate_id: string;
  policy_id: string;
  candidate_hash: string;
  policy_hash: string;
  report_hash: string;
  certified_at: string;
  expires_at: string;
}

export interface WorkflowRolloutObservability {
  schema_version: string;
  project_id: string;
  rollout_mode: WorkflowRolloutMode;
  rollout_generation: number;
  settings_revision: number;
  evaluation_window_id: string | null;
  active_certification_id: string | null;
  legacy_protocol_enabled: boolean;
  legacy_retirement_id: string | null;
  active_candidate_id: string | null;
  active_candidate_hash: string | null;
  active_expires_at: string | null;
  controller_running: boolean;
  controller_healthy: boolean;
  controller_last_success_at: string | null;
  controller_last_error_code: string | null;
  certifications: WorkflowCertificationSummary[];
  events: WorkflowRolloutEvent[];
  health_checks: Record<string, unknown>[];
}

// ────────────────────────────────────────────────────────────────────────────
// Evidence Provenance
// ────────────────────────────────────────────────────────────────────────────

export type EvidenceSourceType =
  | "db"
  | "vector"
  | "tfidf"
  | "external"
  | "marketplace"
  | "cache";

export type EvidenceAuthorityRole =
  | "authoritative"
  | "supplementary"
  | "conflicted"
  | "suppressed";

export type EvidenceConflictType =
  | "numeric_mismatch"
  | "state_mismatch"
  | "semantic_contradiction"
  | "temporal_inconsistency"
  | "availability_conflict";

export type EvidenceConflictSeverity = "info" | "warning" | "blocking";

export interface EvidenceProvenance {
  id: string;
  project_id: string;
  conversation_id: string;
  user_message_id: string;
  assistant_message_id: string | null;
  source_type: EvidenceSourceType;
  source_module: string;
  confidence: number;
  authority_role: EvidenceAuthorityRole;
  context_count: number;
  latency_ms: number | null;
  conflict_ids: string[];
  created_at: string;
}

export interface EvidenceConflict {
  id: string;
  project_id: string;
  user_message_id: string;
  conflict_type: EvidenceConflictType;
  severity: EvidenceConflictSeverity;
  source_a: string;
  source_b: string;
  subject: string | null;
  claim_a: string | null;
  claim_b: string | null;
  resolution: "source_a" | "source_b" | "clarification" | "unresolved" | null;
  resolution_reason: string | null;
  created_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Service utility
// ────────────────────────────────────────────────────────────────────────────

export type { ServiceResult } from "@/lib/api/result";
