import { api } from "gadget-server";
import type { Template, Classification, AppConfiguration } from "@gadget-client/email-wizard";

/**
 * Template Rendering Service
 * 
 * Service for rendering email templates with variable substitution and safety checks.
 */

// Type definitions
interface RenderOptions {
  validate?: boolean;
  sanitize?: boolean;
}

interface RenderResult {
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  missingVariables: string[];
  warnings: string[];
}

interface ValidationResult {
  valid: boolean;
  missingRequired: string[];
  missingOptional: string[];
  extra: string[];
}

interface TemplateMatch {
  template: Template;
  matchScore: number;
  matchReason: string;
}

interface AutoSendCheck {
  canAutoSend: boolean;
  reason: string;
  checksPerformed: string[];
  checksPassed: boolean;
}

interface EmailRecipient {
  emailAddress: {
    address: string;
  };
}

interface EmailMessage {
  subject: string;
  body: {
    contentType: "Text" | "HTML";
    content: string;
  };
  toRecipients: EmailRecipient[];
  ccRecipients?: EmailRecipient[];
  importance?: "low" | "normal" | "high";
}

interface EmailOptions {
  ccRecipients?: string[];
  replyTo?: string;
  importance?: "low" | "normal" | "high";
}

function parseTimeToMinutes(value: string): number | null {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function isWithinBusinessHours(now: Date, from: string, to: string): boolean {
  const fromMinutes = parseTimeToMinutes(from);
  const toMinutes = parseTimeToMinutes(to);
  if (fromMinutes === null || toMinutes === null) return true;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (fromMinutes === toMinutes) return true;

  // Same-day window
  if (fromMinutes < toMinutes) {
    return currentMinutes >= fromMinutes && currentMinutes <= toMinutes;
  }

  // Overnight window (e.g., 22:00 -> 06:00)
  return currentMinutes >= fromMinutes || currentMinutes <= toMinutes;
}

/**
 * Extract all variable placeholders from text
 * Finds all {variable_name} patterns
 * 
 * @param text - The text to extract variables from
 * @returns Array of variable names without braces
 */
export function extractVariablesFromText(text: string): string[] {
  if (!text) return [];
  
  // Match {variable_name} but not {{escaped}}
  const regex = /(?<!\{)\{([a-zA-Z0-9_]+)\}(?!\})/g;
  const matches = [...text.matchAll(regex)];
  const variables = matches.map(match => match[1]);
  
  // Return unique variables
  return [...new Set(variables)];
}

/**
 * Get default/system variables that are always available
 * 
 * @param config - App configuration record
 * @returns Object with default variable values
 */
export function getDefaultVariables(config: AppConfiguration): Record<string, string> {
  const now = new Date();
  
  return {
    company_signature: config.defaultSignature || "Model Railway Scenes Team",
    company_name: config.companyName || "Model Railway Scenes",
    support_hours: config.supportHours || "Mon-Fri 9am-5pm GMT",
    support_email: config.supportEmail || "",
    current_date: now.toLocaleDateString("en-GB"),
    current_year: now.getFullYear().toString(),
  };
}

/**
 * Substitute variable placeholders with actual values
 * Supports {variable_name} syntax and {{ for literal {
 * 
 * @param text - Text containing variable placeholders
 * @param variables - Object with variable values
 * @param availableVars - List of available variable names
 * @returns Text with variables substituted
 */
export function substituteVariables(
  text: string,
  variables: Record<string, string>,
  availableVars: string[]
): string {
  if (!text) return "";
  
  let result = text;
  
  // First, handle escaped braces {{ -> {
  result = result.replace(/\{\{/g, "\x00"); // Temporary placeholder
  
  // Substitute each variable
  for (const varName of availableVars) {
    const value = variables[varName];
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`\\{${varName}\\}`, "g");
      result = result.replace(regex, String(value));
    }
  }
  
  // Restore escaped braces
  result = result.replace(/\x00/g, "{");
  
  return result;
}

/**
 * Validate that required variables are provided
 * 
 * @param template - Template record
 * @param variables - Provided variable values
 * @returns Validation result with missing/extra variables
 */
export function validateTemplateVariables(
  template: Template,
  variables: Record<string, string>
): ValidationResult {
  const availableVars = Array.isArray(template.availableVariables) 
    ? template.availableVariables as string[]
    : [];
  const requiredVars = Array.isArray(template.requiredVariables) 
    ? template.requiredVariables as string[]
    : [];
  
  const providedVars = Object.keys(variables);
  
  // Check for missing required variables
  const missingRequired = requiredVars.filter(
    (varName: string) => !providedVars.includes(varName)
  );
  
  // Check for missing optional variables
  const missingOptional = availableVars.filter(
    (varName: string) => !requiredVars.includes(varName) && !providedVars.includes(varName)
  );
  
  // Check for extra variables not in available list
  const extra = providedVars.filter(
    (varName: string) => !availableVars.includes(varName)
  );
  
  return {
    valid: missingRequired.length === 0,
    missingRequired,
    missingOptional,
    extra,
  };
}

/**
 * Sanitize HTML content to prevent XSS
 * Basic implementation for v1 - strips dangerous tags and attributes
 * 
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  
  let sanitized = html;
  
  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^\s>]*/gi, "");
  
  // Remove dangerous attributes
  sanitized = sanitized.replace(/\sdata-[a-z-]+\s*=\s*["'][^"']*["']/gi, "");
  
  // Remove dangerous tags (keeping basic formatting)
  const dangerousTags = ["iframe", "object", "embed", "link", "style"];
  for (const tag of dangerousTags) {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, "gi");
    sanitized = sanitized.replace(regex, "");
  }
  
  return sanitized;
}

/**
 * Main function to render a template with provided variables
 * 
 * @param template - Template record from database
 * @param variables - Object with variable values
 * @param options - Optional rendering options
 * @returns Rendered template with subject, body, and warnings
 */
export async function renderTemplate(
  template: Template,
  variables: Record<string, string>,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const { validate = true, sanitize = true } = options;
  
  const warnings: string[] = [];
  const missingVariables: string[] = [];
  
  // Get all available variables including defaults
  const availableVars: string[] = Array.isArray(template.availableVariables) 
    ? (template.availableVariables as any[]).filter((item): item is string => typeof item === 'string')
    : [];
  
  // Validate variables if requested
  if (validate) {
    const validation = validateTemplateVariables(template, variables);
    
    if (!validation.valid) {
      missingVariables.push(...validation.missingRequired);
      throw new Error(
        `Missing required variables: ${validation.missingRequired.join(", ")}`
      );
    }
    
    if (validation.missingOptional.length > 0) {
      warnings.push(
        `Missing optional variables: ${validation.missingOptional.join(", ")}`
      );
    }
    
    if (validation.extra.length > 0) {
      warnings.push(
        `Extra variables provided but not used: ${validation.extra.join(", ")}`
      );
    }
  }
  
  // Substitute variables in subject
  const subject = template.subject 
    ? substituteVariables(template.subject, variables, availableVars)
    : "";
  
  // Substitute variables in body text
  const bodyText = substituteVariables(template.bodyText, variables, availableVars);
  
  // Substitute variables in HTML body if present
  let bodyHtml: string | undefined;
  if (template.bodyHtml?.markdown) {
    bodyHtml = substituteVariables(template.bodyHtml.markdown, variables, availableVars);
    
    // Sanitize HTML if requested
    if (sanitize && bodyHtml) {
      bodyHtml = sanitizeHtml(bodyHtml);
    }
  }
  
  return {
    subject,
    bodyText,
    bodyHtml,
    missingVariables,
    warnings,
  };
}

/**
 * Select best matching template for a classification
 * 
 * @param classification - Classification record
 * @param templates - Array of available templates
 * @param config - App configuration
 * @returns Best matching template with score and reason, or null
 */
export function selectTemplateForClassification(
  classification: Classification,
  templates: Template[],
  config: AppConfiguration
): TemplateMatch | null {
  // Filter active templates
  const activeTemplates = templates.filter(t => t.active === true);
  
  if (activeTemplates.length === 0) {
    return null;
  }
  
  const scores: Array<{ template: Template; score: number; reasons: string[] }> = [];
  
  for (const template of activeTemplates) {
    let score = 0;
    const reasons: string[] = [];
    
    // Check if category matches (or template is general)
    const intentCategory = classification.intentCategory;
    const triggerCategories: string[] = Array.isArray(template.triggerIntentCategories)
      ? (template.triggerIntentCategories as any[]).filter((item): item is string => typeof item === 'string')
      : [];
    
    if (triggerCategories.includes(intentCategory)) {
      score += 10;
      reasons.push(`Category match: ${intentCategory}`);
    } else if (template.category === "general_faq") {
      score += 3;
      reasons.push("General FAQ template");
    }
    
    // Check trigger keywords (if any)
    const triggerKeywords: string[] = Array.isArray(template.triggerKeywords)
      ? (template.triggerKeywords as any[]).filter((item): item is string => typeof item === 'string')
      : [];
    
    if (triggerKeywords.length > 0) {
      // Would need to check against email content - simplified for now
      score += 2;
      reasons.push("Has trigger keywords");
    }
    
    // Check excludeIfPresent
    const excludeKeywords: string[] = Array.isArray(template.excludeIfPresent)
      ? (template.excludeIfPresent as any[]).filter((item): item is string => typeof item === 'string')
      : [];
    
    if (excludeKeywords.length > 0) {
      // Would need to check against email content
      // For now, just note it exists
      reasons.push("Has exclusion rules");
    }
    
    // Prefer safer templates
    if (template.safetyLevel === "safe") {
      score += 5;
      reasons.push("Safe template");
    } else if (template.safetyLevel === "moderate") {
      score += 2;
      reasons.push("Moderate safety");
    }
    
    // Prefer templates with higher auto-send confidence threshold
    if (template.autoSendEnabled && template.autoSendConfidenceThreshold) {
      if (classification.automationConfidence >= template.autoSendConfidenceThreshold) {
        score += 3;
        reasons.push("Meets auto-send confidence threshold");
      }
    }
    
    scores.push({ template, score, reasons });
  }
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  const best = scores[0];
  if (!best || best.score === 0) {
    return null;
  }
  
  return {
    template: best.template,
    matchScore: best.score,
    matchReason: best.reasons.join("; "),
  };
}

/**
 * Determine if template can be auto-sent based on safety checks
 * 
 * @param template - Template record
 * @param classification - Classification record
 * @param config - App configuration
 * @returns Auto-send check result with reason and checks
 */
export function canAutoSendTemplate(
  template: Template,
  classification: Classification,
  config: AppConfiguration
): AutoSendCheck {
  const checksPerformed: string[] = [];
  const failedChecks: string[] = [];
  
  // Check 1: Global auto-send enabled
  checksPerformed.push("Global auto-send enabled");
  if (!config.autoSendGlobalEnabled) {
    failedChecks.push("Global auto-send is disabled");
  }
  
  // Check 1b: Opening hours (if enabled)
  if (config.autoSendOpeningHours) {
    checksPerformed.push("Within business hours");
    const from = config.businessHoursFrom || "09:00";
    const to = config.businessHoursTo || "17:00";
    if (!isWithinBusinessHours(new Date(), from, to)) {
      failedChecks.push("Outside configured business hours");
    }
  }

  // Check 2: Template auto-send enabled
  checksPerformed.push("Template auto-send enabled");
  if (!template.autoSendEnabled) {
    failedChecks.push("Template auto-send is disabled");
  }
  
  // Check 3: Category not in never auto-send list
  checksPerformed.push("Category allowed for auto-send");
  const neverAutoSendCategories = Array.isArray(config.neverAutoSendCategories)
    ? (config.neverAutoSendCategories as unknown[]).filter((item): item is string => typeof item === 'string')
    : [];
  
  if (neverAutoSendCategories.includes(classification.intentCategory)) {
    failedChecks.push(`Category ${classification.intentCategory} is in never auto-send list`);
  }
  
  // Check 4: Confidence threshold met
  checksPerformed.push("Confidence threshold met");
  const threshold = template.autoSendConfidenceThreshold || 0.85;
  if (classification.automationConfidence < threshold) {
    failedChecks.push(
      `Automation confidence ${classification.automationConfidence} below threshold ${threshold}`
    );
  }
  
  // Check 5: Template safety level
  checksPerformed.push("Template safety level");
  if (template.safetyLevel === "risky") {
    failedChecks.push("Template is marked as risky");
  }
  
  // Check 6: No risk flags in classification
  checksPerformed.push("No risk flags");
  if (classification.containsLegalThreat) {
    failedChecks.push("Classification contains legal threat");
  }
  if (classification.containsChargebackMention) {
    failedChecks.push("Classification contains chargeback mention");
  }
  if (classification.requiresRefund) {
    failedChecks.push("Classification requires refund");
  }
  
  // Check 7: Daily auto-send limit
  checksPerformed.push("Daily auto-send limit");
  const dailyCount = config.autoSendTodayCount || 0;
  const dailyMax = config.autoSendMaxPerDay || 50;
  if (dailyCount >= dailyMax) {
    failedChecks.push(`Daily auto-send limit reached (${dailyCount}/${dailyMax})`);
  }
  
  // Determine result
  const canAutoSend = failedChecks.length === 0;
  const reason = canAutoSend
    ? "All safety checks passed"
    : `Failed checks: ${failedChecks.join("; ")}`;
  
  return {
    canAutoSend,
    reason,
    checksPerformed,
    checksPassed: canAutoSend,
  };
}

/**
 * Construct email message object for Microsoft Graph API
 * 
 * @param renderedTemplate - Output from renderTemplate
 * @param toRecipients - Array of email addresses
 * @param options - Optional cc, replyTo, importance
 * @returns Graph API message object
 */
export function buildEmailMessage(
  renderedTemplate: RenderResult,
  toRecipients: string[],
  options: EmailOptions = {}
): EmailMessage {
  const { ccRecipients, importance = "normal" } = options;
  
  // Determine content type based on whether HTML is present
  const contentType = renderedTemplate.bodyHtml ? "HTML" : "Text";
  const content = renderedTemplate.bodyHtml || renderedTemplate.bodyText;
  
  // Build message object
  const message: EmailMessage = {
    subject: renderedTemplate.subject,
    body: {
      contentType,
      content,
    },
    toRecipients: toRecipients.map(address => ({
      emailAddress: { address },
    })),
    importance,
  };
  
  // Add CC recipients if provided
  if (ccRecipients && ccRecipients.length > 0) {
    message.ccRecipients = ccRecipients.map(address => ({
      emailAddress: { address },
    }));
  }
  
  return message;
}

/**
 * Increment usage count and update lastUsedAt for a template
 * 
 * @param template - Template record
 * @param apiClient - Gadget API client
 */
export async function logTemplateUsage(
  template: Template,
  apiClient: typeof api
): Promise<void> {
  const currentCount = template.useCount || 0;
  
  await apiClient.template.update(template.id, {
    useCount: currentCount + 1,
    lastUsedAt: new Date(),
  });
}