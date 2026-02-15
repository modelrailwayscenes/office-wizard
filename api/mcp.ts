import { api } from "gadget-server";

/**
 * Model Context Protocol (MCP) server for Email Wizard application.
 * 
 * This MCP server exposes email management capabilities to AI assistants like ChatGPT.
 * It provides tools for checking high priority emails, triaging conversations, searching,
 * viewing details, sending replies, and managing templates.
 * 
 * Tools are designed to be used by AI assistants to help manage customer email support.
 */
const mcpServer = {
  registerTool: (config: any) => {},
  handleRequest: async (body: any) => ({}),
  getCapabilities: async () => ({})
};

/**
 * Tool 1: Check high priority emails that need immediate attention
 */
mcpServer.registerTool({
  name: "check_high_priority_emails",
  description: "Check high priority (P0/P1) email conversations that need immediate attention. Returns conversations with their priority scores, customer info, and AI recommendations.",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  },
  annotations: {
    readOnlyHint: true
  },
  handler: async () => {
    try {
      const conversations = await api.conversation.findMany({
        filter: {
          AND: [
            {
              currentPriorityBand: {
                in: ["P0", "P1"]
              }
            },
            {
              status: {
                notEquals: "resolved"
              }
            }
          ]
        },
        select: {
          id: true,
          subject: true,
          primaryCustomerEmail: true,
          currentPriorityBand: true,
          currentPriorityScore: true,
          automationTag: true,
          status: true,
          firstMessageAt: true,
          latestMessageAt: true,
          sentiment: true,
          classifications: {
            edges: {
              node: {
                sentimentLabel: true,
                emotionTags: true,
                sentimentScore: true,
                riskChurnScore: true
              }
            }
          }
        },
        sort: [
          { currentPriorityScore: "Descending" }
        ]
      });

      const structuredContent = {
        conversations: conversations.map(conv => {
          const latestClassification = conv.classifications.edges.length > 0 
            ? conv.classifications.edges[0].node 
            : null;
          return {
            id: conv.id,
            subject: conv.subject,
            customerEmail: conv.primaryCustomerEmail,
            priorityBand: conv.currentPriorityBand,
            priorityScore: conv.currentPriorityScore,
            automationRecommendation: conv.automationTag,
            status: conv.status,
            firstMessageAt: conv.firstMessageAt,
            latestMessageAt: conv.latestMessageAt,
            sentiment: conv.sentiment,
            sentimentLabel: latestClassification?.sentimentLabel,
            emotionTags: latestClassification?.emotionTags,
            sentimentScore: latestClassification?.sentimentScore,
            riskChurnScore: latestClassification?.riskChurnScore
          };
        }),
        count: conversations.length
      };

      const content = `Found ${conversations.length} high priority email(s):\n\n` +
        conversations.map((conv, idx) => {
          const latestClassification = conv.classifications.edges.length > 0 
            ? conv.classifications.edges[0].node 
            : null;
          return `${idx + 1}. [${conv.currentPriorityBand}] ${conv.subject}\n` +
            `   Customer: ${conv.primaryCustomerEmail}\n` +
            `   Priority Score: ${conv.currentPriorityScore}\n` +
            `   AI Recommendation: ${conv.automationTag}\n` +
            `   Status: ${conv.status}\n` +
            `   Sentiment: ${latestClassification?.sentimentLabel || conv.sentiment || 'N/A'}\n` +
            `   Risk Score: ${latestClassification?.riskChurnScore || 'N/A'}\n`;
        }).join('\n');

      return {
        structuredContent,
        content,
        _meta: {
          "openai/outputTemplate": "high-priority-emails"
        }
      };
    } catch (error: any) {
      return {
        content: `Error checking high priority emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true
      };
    }
  }
});

/**
 * Tool 2: Run AI triage on email conversations
 */
mcpServer.registerTool({
  name: "triage_emails",
  description: "Run AI triage on new or unprocessed email conversations. This will classify emails by intent, sentiment, priority, and provide automation recommendations.",
  inputSchema: {
    type: "object",
    properties: {
      batchSize: {
        type: "number",
        description: "Maximum number of conversations to triage in this batch (default: 20)",
        default: 20
      }
    },
    required: []
  },
  handler: async ({ batchSize = 20 }: { batchSize?: number }) => {
    try {
      const result = await api.triageAllPending({
        batchSize: batchSize
      });

      const structuredContent = {
        success: result.success,
        triageResults: result.result
      };

      const content = result.success 
        ? `Successfully triaged emails. Results: ${JSON.stringify(result.result, null, 2)}`
        : `Triage failed with errors: ${result.errors.map((e: any) => e.message).join(', ')}`;

      return {
        structuredContent,
        content,
        _meta: {
          "openai/outputTemplate": "triage-results"
        }
      };
    } catch (error: any) {
      return {
        content: `Error running email triage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true
      };
    }
  }
});

/**
 * Tool 3: View detailed conversation information
 */
mcpServer.registerTool({
  name: "view_conversation",
  description: "View detailed information about a specific email conversation including all messages, classification details, and priority scoring explanation.",
  inputSchema: {
    type: "object",
    properties: {
      conversationId: {
        type: "string",
        description: "The ID of the conversation to view"
      }
    },
    required: ["conversationId"]
  },
  annotations: {
    readOnlyHint: true
  },
  handler: async ({ conversationId }: { conversationId: string }) => {
    try {
      const conversation = await api.conversation.findOne(conversationId, {
        select: {
          id: true,
          conversationId: true,
          subject: true,
          primaryCustomerEmail: true,
          primaryCustomerName: true,
          currentPriorityBand: true,
          currentPriorityScore: true,
          currentCategory: true,
          automationTag: true,
          status: true,
          assignedTo: true,
          resolved: true,
          resolvedAt: true,
          autoResolved: true,
          requiresHumanReview: true,
          hasDeadline: true,
          deadlineDate: true,
          firstMessageAt: true,
          latestMessageAt: true,
          messageCount: true,
          unreadCount: true,
          participants: true,
          folderPath: true,
          internalNotes: true,
          messages: {
            edges: {
              node: {
                id: true,
                subject: true,
                fromAddress: true,
                fromName: true,
                toAddresses: true,
                bodyPreview: true,
                receivedDateTime: true,
                sentDateTime: true,
                isRead: true,
                hasAttachments: true
              }
            }
          },
          classifications: {
            edges: {
              node: {
                id: true,
                intentCategory: true,
                intentConfidence: true,
                sentimentLabel: true,
                sentimentScore: true,
                priorityBand: true,
                priorityScore: true,
                automationTag: true,
                automationConfidence: true,
                automationReason: true,
                timeSensitivityScore: true,
                riskChurnScore: true,
                operationalBlockerScore: true,
                valueBandScore: true,
                emotionTags: true,
                extractedOrderId: true,
                extractedCustomerName: true,
                classifiedAt: true
              }
            }
          }
        }
      });

      const structuredContent = {
        conversation: {
          id: conversation.id,
          subject: conversation.subject,
          customer: {
            email: conversation.primaryCustomerEmail,
            name: conversation.primaryCustomerName
          },
          priority: {
            band: conversation.currentPriorityBand,
            score: conversation.currentPriorityScore,
            category: conversation.currentCategory
          },
          automation: {
            tag: conversation.automationTag,
            requiresHumanReview: conversation.requiresHumanReview
          },
          status: conversation.status,
          assignedTo: conversation.assignedTo,
          resolved: conversation.resolved,
          messageCount: conversation.messageCount,
          messages: conversation.messages.edges.map(edge => edge.node),
          classifications: conversation.classifications.edges.map(edge => edge.node)
        }
      };

      const content = `Conversation Details:\n\n` +
        `Subject: ${conversation.subject}\n` +
        `Customer: ${conversation.primaryCustomerName} (${conversation.primaryCustomerEmail})\n` +
        `Priority: ${conversation.currentPriorityBand} (Score: ${conversation.currentPriorityScore})\n` +
        `Category: ${conversation.currentCategory}\n` +
        `Status: ${conversation.status}\n` +
        `Messages: ${conversation.messageCount}\n` +
        `AI Recommendation: ${conversation.automationTag}\n` +
        `Requires Human Review: ${conversation.requiresHumanReview}\n\n` +
        `Recent Messages:\n` +
        conversation.messages.edges.slice(0, 3).map((edge, idx) => 
          `${idx + 1}. From: ${edge.node.fromName || edge.node.fromAddress}\n` +
          `   Date: ${edge.node.receivedDateTime}\n` +
          `   Preview: ${edge.node.bodyPreview}\n`
        ).join('\n');

      return {
        structuredContent,
        content,
        _meta: {
          "openai/outputTemplate": "conversation-detail"
        }
      };
    } catch (error: any) {
      return {
        content: `Error viewing conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true
      };
    }
  }
});

/**
 * Tool 4: Search email conversations
 */
mcpServer.registerTool({
  name: "search_conversations",
  description: "Search email conversations by customer email, subject keywords, status, or sentiment. Useful for finding specific customer inquiries.",
  inputSchema: {
    type: "object",
    properties: {
      customerEmail: {
        type: "string",
        description: "Filter by customer email address"
      },
      subjectKeyword: {
        type: "string",
        description: "Search for keyword in email subject"
      },
      status: {
        type: "string",
        description: "Filter by conversation status (new, in_progress, waiting_customer, waiting_internal, resolved, archived)",
        enum: ["new", "in_progress", "waiting_customer", "waiting_internal", "resolved", "archived"]
      },
      sentimentLabel: {
        type: "string",
        description: "Filter by sentiment label",
        enum: ["very_negative", "negative", "neutral", "positive", "very_positive"]
      },
      emotionTag: {
        type: "string",
        description: "Filter by emotion tag (e.g., frustrated, angry, confused)"
      },
      minRiskChurnScore: {
        type: "number",
        description: "Minimum risk/churn score (0-3)"
      }
    },
    required: []
  },
  annotations: {
    readOnlyHint: true
  },
  handler: async ({ customerEmail, subjectKeyword, status, sentimentLabel, emotionTag, minRiskChurnScore }: { customerEmail?: string; subjectKeyword?: string; status?: string; sentimentLabel?: string; emotionTag?: string; minRiskChurnScore?: number }) => {
    try {
      const filters: Array<Record<string, any>> = [];

      if (customerEmail) {
        filters.push({
          primaryCustomerEmail: {
            equals: customerEmail
          }
        });
      }

      if (subjectKeyword) {
        filters.push({
          subject: {
            startsWith: subjectKeyword
          }
        });
      }

      if (status) {
        filters.push({
          status: {
            equals: status
          }
        });
      }

      if (sentimentLabel) {
        filters.push({
          classifications: {
            some: {
              sentimentLabel: {
                equals: sentimentLabel
              }
            }
          }
        });
      }

      if (emotionTag) {
        filters.push({
          classifications: {
            some: {
              emotionTags: {
                matches: { [emotionTag]: true }
              }
            }
          }
        });
      }

      if (minRiskChurnScore !== undefined) {
        filters.push({
          classifications: {
            some: {
              riskChurnScore: {
                greaterThanOrEqual: minRiskChurnScore
              }
            }
          }
        });
      }

      const conversations = await api.conversation.findMany({
        filter: filters.length > 0 ? { AND: filters } : undefined,
        select: {
          id: true,
          subject: true,
          primaryCustomerEmail: true,
          primaryCustomerName: true,
          currentPriorityBand: true,
          status: true,
          messageCount: true,
          latestMessageAt: true,
          sentiment: true,
          classifications: {
            edges: {
              node: {
                sentimentLabel: true,
                emotionTags: true,
                riskChurnScore: true,
                sentimentScore: true
              }
            }
          }
        },
        sort: [
          { latestMessageAt: "Descending" }
        ]
      });

      const structuredContent = {
        conversations: conversations.map(conv => {
          const latestClassification = conv.classifications.edges.length > 0 
            ? conv.classifications.edges[0].node 
            : null;
          return {
            id: conv.id,
            subject: conv.subject,
            customerEmail: conv.primaryCustomerEmail,
            customerName: conv.primaryCustomerName,
            priorityBand: conv.currentPriorityBand,
            status: conv.status,
            messageCount: conv.messageCount,
            latestMessageAt: conv.latestMessageAt,
            sentiment: conv.sentiment,
            sentimentLabel: latestClassification?.sentimentLabel,
            emotionTags: latestClassification?.emotionTags,
            riskChurnScore: latestClassification?.riskChurnScore,
            sentimentScore: latestClassification?.sentimentScore
          };
        }),
        count: conversations.length,
        searchCriteria: {
          customerEmail,
          subjectKeyword,
          status,
          sentimentLabel,
          emotionTag,
          minRiskChurnScore
        }
      };

      const content = `Found ${conversations.length} conversation(s):\n\n` +
        conversations.map((conv, idx) => {
          const latestClassification = conv.classifications.edges.length > 0 
            ? conv.classifications.edges[0].node 
            : null;
          return `${idx + 1}. ${conv.subject}\n` +
            `   Customer: ${conv.primaryCustomerName} (${conv.primaryCustomerEmail})\n` +
            `   Status: ${conv.status}\n` +
            `   Priority: ${conv.currentPriorityBand}\n` +
            `   Sentiment: ${latestClassification?.sentimentLabel || conv.sentiment || 'N/A'}\n` +
            `   Risk Score: ${latestClassification?.riskChurnScore || 'N/A'}\n` +
            `   Last Activity: ${conv.latestMessageAt}\n`;
        }).join('\n');

      return {
        structuredContent,
        content,
        _meta: {
          "openai/outputTemplate": "conversation-list"
        }
      };
    } catch (error: any) {
      return {
        content: `Error searching conversations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true
      };
    }
  }
});

/**
 * Tool 5: Analyze sentiment across conversations
 */
mcpServer.registerTool({
  name: "analyze_sentiment",
  description: "Analyze sentiment and emotions across email conversations. Filter by sentiment labels, emotion tags, and risk scores to identify customers who need attention.",
  inputSchema: {
    type: "object",
    properties: {
      sentimentLabel: {
        type: "string",
        description: "Filter by sentiment label",
        enum: ["very_negative", "negative", "neutral", "positive", "very_positive"]
      },
      emotionTags: {
        type: "array",
        description: "Filter by emotion tags (e.g., ['frustrated', 'angry'])",
        items: {
          type: "string"
        }
      },
      minRiskChurnScore: {
        type: "number",
        description: "Minimum risk/churn score (0-3)"
      },
      minSentimentScore: {
        type: "number",
        description: "Minimum sentiment score (0-3)"
      },
      maxSentimentScore: {
        type: "number",
        description: "Maximum sentiment score (0-3)"
      }
    },
    required: []
  },
  annotations: {
    readOnlyHint: true
  },
  handler: async ({ sentimentLabel, emotionTags, minRiskChurnScore, minSentimentScore, maxSentimentScore }: { sentimentLabel?: string; emotionTags?: string[]; minRiskChurnScore?: number; minSentimentScore?: number; maxSentimentScore?: number }) => {
    try {
      const filters: Array<Record<string, any>> = [];

      if (sentimentLabel) {
        filters.push({
          classifications: {
            some: {
              sentimentLabel: {
                equals: sentimentLabel
              }
            }
          }
        });
      }

      if (emotionTags && emotionTags.length > 0) {
        emotionTags.forEach(tag => {
          filters.push({
            classifications: {
              some: {
                emotionTags: {
                  matches: { [tag]: true }
                }
              }
            }
          });
        });
      }

      if (minRiskChurnScore !== undefined) {
        filters.push({
          classifications: {
            some: {
              riskChurnScore: {
                greaterThanOrEqual: minRiskChurnScore
              }
            }
          }
        });
      }

      if (minSentimentScore !== undefined) {
        filters.push({
          classifications: {
            some: {
              sentimentScore: {
                greaterThanOrEqual: minSentimentScore
              }
            }
          }
        });
      }

      if (maxSentimentScore !== undefined) {
        filters.push({
          classifications: {
            some: {
              sentimentScore: {
                lessThanOrEqual: maxSentimentScore
              }
            }
          }
        });
      }

      const conversations = await api.conversation.findMany({
        filter: filters.length > 0 ? { AND: filters } : undefined,
        select: {
          id: true,
          conversationId: true,
          subject: true,
          primaryCustomerEmail: true,
          primaryCustomerName: true,
          currentPriorityBand: true,
          currentPriorityScore: true,
          status: true,
          messageCount: true,
          latestMessageAt: true,
          sentiment: true,
          classifications: {
            edges: {
              node: {
                id: true,
                sentimentLabel: true,
                sentimentScore: true,
                emotionTags: true,
                riskChurnScore: true,
                timeSensitivityScore: true,
                operationalBlockerScore: true,
                intentCategory: true,
                automationTag: true,
                classifiedAt: true
              }
            }
          }
        },
        sort: [
          { latestMessageAt: "Descending" }
        ]
      });

      const structuredContent = {
        conversations: conversations.map(conv => {
          const latestClassification = conv.classifications.edges.length > 0 
            ? conv.classifications.edges[0].node 
            : null;
          return {
            id: conv.id,
            conversationId: conv.conversationId,
            subject: conv.subject,
            customer: {
              email: conv.primaryCustomerEmail,
              name: conv.primaryCustomerName
            },
            priority: {
              band: conv.currentPriorityBand,
              score: conv.currentPriorityScore
            },
            status: conv.status,
            messageCount: conv.messageCount,
            latestMessageAt: conv.latestMessageAt,
            sentiment: {
              label: latestClassification?.sentimentLabel,
              score: latestClassification?.sentimentScore,
              emotionTags: latestClassification?.emotionTags,
              riskChurnScore: latestClassification?.riskChurnScore,
              timeSensitivityScore: latestClassification?.timeSensitivityScore,
              operationalBlockerScore: latestClassification?.operationalBlockerScore
            },
            classification: {
              intentCategory: latestClassification?.intentCategory,
              automationTag: latestClassification?.automationTag,
              classifiedAt: latestClassification?.classifiedAt
            }
          };
        }),
        count: conversations.length,
        filterCriteria: {
          sentimentLabel,
          emotionTags,
          minRiskChurnScore,
          minSentimentScore,
          maxSentimentScore
        }
      };

      const content = `Found ${conversations.length} conversation(s) matching sentiment criteria:\n\n` +
        conversations.map((conv, idx) => {
          const latestClassification = conv.classifications.edges.length > 0 
            ? conv.classifications.edges[0].node 
            : null;
          const emotionsList = latestClassification?.emotionTags 
            ? Object.keys(latestClassification.emotionTags).join(', ')
            : 'none';
          return `${idx + 1}. ${conv.subject}\n` +
            `   Customer: ${conv.primaryCustomerName} (${conv.primaryCustomerEmail})\n` +
            `   Sentiment: ${latestClassification?.sentimentLabel || 'N/A'} (Score: ${latestClassification?.sentimentScore || 'N/A'})\n` +
            `   Emotions: ${emotionsList}\n` +
            `   Risk/Churn Score: ${latestClassification?.riskChurnScore || 'N/A'}\n` +
            `   Time Sensitivity: ${latestClassification?.timeSensitivityScore || 'N/A'}\n` +
            `   Operational Blocker: ${latestClassification?.operationalBlockerScore || 'N/A'}\n` +
            `   Priority: ${conv.currentPriorityBand} (${conv.currentPriorityScore})\n` +
            `   Status: ${conv.status}\n`;
        }).join('\n');

      return {
        structuredContent,
        content,
        _meta: {
          "openai/outputTemplate": "sentiment-dashboard"
        }
      };
    } catch (error: any) {
      return {
        content: `Error analyzing sentiment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true
      };
    }
  }
});

/**
 * Tool 6: Send email reply
 */
mcpServer.registerTool({
  name: "send_reply",
  description: "Send an email reply to a conversation. Can use templates or custom text. Requires approval for high priority emails.",
  inputSchema: {
    type: "object",
    properties: {
      conversationId: {
        type: "string",
        description: "The ID of the conversation to reply to"
      },
      templateId: {
        type: "string",
        description: "ID of the email template to use (optional if customBody is provided)"
      },
      customBody: {
        type: "string",
        description: "Custom email body text (optional if templateId is provided)"
      },
      variables: {
        type: "object",
        description: "Variables to populate in the template"
      },
      requiresApproval: {
        type: "boolean",
        description: "Whether this reply requires approval before sending",
        default: true
      },
      approvedBy: {
        type: "string",
        description: "Name or email of person who approved this reply"
      }
    },
    required: ["conversationId"]
  },
  handler: async ({ conversationId, templateId, customBody, variables, requiresApproval = true, approvedBy }: { conversationId: string; templateId?: string; customBody?: string; variables?: Record<string, any>; requiresApproval?: boolean; approvedBy?: string }) => {
    try {
      // Validate that either templateId or customBody is provided
      if (!templateId && !customBody) {
        return {
          content: "Error: Either templateId or customBody must be provided",
          isError: true
        };
      }

      // Get the app configuration to retrieve access token
      const appConfig = await api.appConfiguration.findFirst({
        select: {
          microsoftAccessToken: true,
          outlookConnected: true
        }
      });

      if (!appConfig || !appConfig.outlookConnected || !appConfig.microsoftAccessToken) {
        return {
          content: "Error: Microsoft 365 is not connected. Please connect your Outlook account first.",
          isError: true
        };
      }

      const result = await api.sendEmail({
        accessToken: appConfig.microsoftAccessToken,
        conversationId,
        templateId,
        customBody,
        variables,
        requiresApproval,
        approvedBy,
        saveAsDraft: false
      });

      const content = result.success
        ? `Successfully sent email reply to conversation ${conversationId}. ${result.messageId ? `Message ID: ${result.messageId}` : ''}`
        : `Failed to send email: Unknown error`;

      return {
        content,
        isError: !result.success
      };
    } catch (error: any) {
      return {
        content: `Error sending email reply: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true
      };
    }
  }
});

/**
 * Tool 7: List available email templates
 */
mcpServer.registerTool({
  name: "list_templates",
  description: "List available email templates for quick replies.",
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "Filter templates by category",
        enum: ["tracking_request", "product_instructions", "opening_hours", "general_faq", "request_more_info", "refund_policy", "delivery_info", "custom"]
      }
    },
    required: []
  },
  annotations: {
    readOnlyHint: true
  },
  handler: async ({ category }: { category?: string }) => {
    try {
      const templates = await api.template.findMany({
        filter: category ? {
          category: {
            equals: category
          }
        } : undefined,
        select: {
          id: true,
          name: true,
          subject: true,
          category: true,
          bodyText: true,
          description: true,
          autoSendEnabled: true,
          safetyLevel: true
        }
      });

      const structuredContent = {
        templates: templates.map(tmpl => ({
          id: tmpl.id,
          name: tmpl.name,
          subject: tmpl.subject,
          category: tmpl.category,
          bodyPreview: tmpl.bodyText?.substring(0, 150),
          description: tmpl.description,
          autoSendEnabled: tmpl.autoSendEnabled,
          safetyLevel: tmpl.safetyLevel
        })),
        count: templates.length,
        filterCategory: category
      };

      const content = `Found ${templates.length} template(s)${category ? ` in category '${category}'` : ''}:\n\n` +
        templates.map((tmpl, idx) => 
          `${idx + 1}. ${tmpl.name} (ID: ${tmpl.id})\n` +
          `   Category: ${tmpl.category}\n` +
          `   Subject: ${tmpl.subject}\n` +
          `   Description: ${tmpl.description || 'N/A'}\n` +
          `   Safety Level: ${tmpl.safetyLevel}\n`
        ).join('\n');

      return {
        structuredContent,
        content,
        _meta: {
          "openai/outputTemplate": "template-list"
        }
      };
    } catch (error: any) {
      return {
        content: `Error listing templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true
      };
    }
  }
});

export default mcpServer;