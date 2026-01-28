import { z } from "zod";

// ============================================================================
// ZONES
// ============================================================================
export const ZoneSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.string().optional(),
});
export type Zone = z.infer<typeof ZoneSchema>;

// ============================================================================
// DEMOGRAPHICS
// ============================================================================
export const AgeBucketSchema = z.object({
  id: z.string(),
  label: z.string(),
  min: z.number().int().min(0),
  max: z.number().int().max(150),
  weight: z.number().min(0).max(100).default(0),
});

export const RegionSchema = z.object({
  id: z.string(),
  label: z.string(),
  weight: z.number().min(0).max(100).default(0),
});

export const SocioClassSchema = z.object({
  id: z.string(),
  label: z.string(),
  weight: z.number().min(0).max(100).default(0),
});

export type AgeBucket = z.infer<typeof AgeBucketSchema>;
export type Region = z.infer<typeof RegionSchema>;
export type SocioClass = z.infer<typeof SocioClassSchema>;

// ============================================================================
// CLUSTERS
// ============================================================================
export const ClusterSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  name: z.string().min(1),
  description_prompt: z.string().min(10),
  weight: z.number().min(0).max(100).default(0),
  demographics: z.object({
    ageBuckets: z.array(AgeBucketSchema).optional(),
    regions: z.array(RegionSchema).optional(),
    socioClasses: z.array(SocioClassSchema).optional(),
  }).optional(),
});
export type Cluster = z.infer<typeof ClusterSchema>;

// ============================================================================
// AGENTS
// ============================================================================

// Life events that shape an agent's worldview
export const LifeEventSchema = z.object({
  year: z.number().int(),
  event: z.string(),
  category: z.enum(["family", "career", "health", "financial", "political", "social", "education"]),
  emotionalImpact: z.number().min(-100).max(100), // -100 = traumatic, +100 = very positive
});
export type LifeEvent = z.infer<typeof LifeEventSchema>;

// Core values with hierarchy
export const CoreValueSchema = z.object({
  value: z.enum([
    "security", "freedom", "family", "success", "tradition", "justice",
    "community", "independence", "loyalty", "faith", "equality", "prosperity"
  ]),
  importance: z.number().min(1).max(10),
});
export type CoreValue = z.infer<typeof CoreValueSchema>;

// Financial situation
export const FinancialProfileSchema = z.object({
  incomeLevel: z.enum(["very_low", "low", "middle", "upper_middle", "high", "very_high"]),
  hasDebt: z.boolean(),
  ownsProperty: z.boolean(),
  financialAnxiety: z.number().min(0).max(100),
  dependents: z.number().int().min(0),
});
export type FinancialProfile = z.infer<typeof FinancialProfileSchema>;

// Social influence profile
export const SocialProfileSchema = z.object({
  familyInfluence: z.number().min(0).max(100),
  peerPressure: z.number().min(0).max(100),
  trustInInstitutions: z.number().min(0).max(100),
  trustInMedia: z.number().min(0).max(100),
  communityInvolvement: z.enum(["none", "low", "medium", "high"]),
});
export type SocialProfile = z.infer<typeof SocialProfileSchema>;

// Media consumption and information sources
export const MediaProfileSchema = z.object({
  primarySources: z.array(z.enum([
    "social_media", "tv_news", "newspapers", "radio", "word_of_mouth",
    "government_sources", "independent_media", "international_media"
  ])),
  politicalLeaning: z.number().min(-100).max(100), // -100 = left, +100 = right
  skepticismLevel: z.number().min(0).max(100),
});
export type MediaProfile = z.infer<typeof MediaProfileSchema>;

// Agent's memory of past interactions
export const AgentMemoryEntrySchema = z.object({
  date: z.string(),
  topic: z.string(),
  simulationId: z.string().optional(),
  pollId: z.string().optional(),
  stance: z.number().min(0).max(100),
  emotion: z.string(),
  keyArguments: z.array(z.string()),
  response: z.string().optional(),
});
export type AgentMemoryEntry = z.infer<typeof AgentMemoryEntrySchema>;

// Anchored beliefs (stable positions on topics)
export const AnchoredBeliefSchema = z.object({
  topic: z.string(),
  stance: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  lastUpdated: z.string(),
  timesExpressed: z.number().int().min(1),
});
export type AnchoredBelief = z.infer<typeof AnchoredBeliefSchema>;

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  agentNumber: z.number().int().positive().optional(),
  age: z.number().int().min(0).max(150),
  gender: z.enum(["male", "female", "other"]).optional(),
  ageBucketId: z.string(),
  regionId: z.string(),
  cspId: z.string(),
  socio_demo: z.string(),
  cluster_id: z.string(),
  traits: z.array(z.string()),
  priors: z.string(),
  speaking_style: z.string(),
  
  // Expression profile
  expression_profile: z.object({
    directness: z.number().min(0).max(100).default(50),
    social_filter: z.number().min(0).max(100).default(50),
    conformity_pressure: z.number().min(0).max(100).default(50),
    context_sensitivity: z.enum(["high", "medium", "low"]).default("medium"),
  }).optional(),
  
  // Basic psychological profile (legacy)
  psychological_profile: z.object({
    core_values: z.array(z.string()).optional(),
    cognitive_biases: z.array(z.string()).optional(),
    risk_tolerance: z.number().min(0).max(100).default(50),
    assertiveness: z.number().min(0).max(100).default(50),
  }).optional(),
  
  // NEW: Rich life history
  lifeHistory: z.object({
    lifeEvents: z.array(LifeEventSchema).optional(),
    coreValues: z.array(CoreValueSchema).optional(),
    formativeExperiences: z.array(z.string()).optional(),
  }).optional(),
  
  // NEW: Financial situation
  financialProfile: FinancialProfileSchema.optional(),
  
  // NEW: Social influence
  socialProfile: SocialProfileSchema.optional(),
  
  // NEW: Media consumption
  mediaProfile: MediaProfileSchema.optional(),
  
  // NEW: Memory of past interactions
  memory: z.object({
    interactions: z.array(AgentMemoryEntrySchema).optional(),
    anchoredBeliefs: z.array(AnchoredBeliefSchema).optional(),
  }).optional(),
  
  // Metadata
  createdAt: z.string().optional(),
  lastInteractionAt: z.string().optional(),
});
export type Agent = z.infer<typeof AgentSchema>;

// ============================================================================
// REACTIONS
// ============================================================================
export const EmotionSchema = z.enum([
  "anger", "fear", "hope", "cynicism", "pride", 
  "sadness", "indifference", "enthusiasm", "mistrust"
]);

export const ReactionTurnSchema = z.object({
  stance_score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  emotion: EmotionSchema,
  key_reasons: z.array(z.string()).length(3),
  response: z.string().min(80).max(160),
  true_belief: z.object({
    inner_stance_score: z.number().min(0).max(100),
    cognitive_biases: z.array(z.string()).optional(),
    core_values_impact: z.string().optional(),
    self_awareness: z.number().min(0).max(100).optional(),
  }).optional(),
  public_expression: z.object({
    expressed_stance_score: z.number().min(0).max(100),
    expression_modifier: z.number().min(-50).max(50).optional(),
    filter_reasons: z.array(z.string()).optional(),
    context: z.enum(["public", "semi_public", "private", "social_media", "secret_ballot"]).optional(),
  }).optional(),
  behavioral_action: z.object({
    action_type: z.enum([
      "vote_for", "vote_against", "vote_blank", "abstention",
      "petition_for", "petition_against", "manifestation_for", "manifestation_against",
      "public_support_for", "public_support_against", "no_action"
    ]),
    action_intensity: z.number().min(0).max(100),
    action_consistency: z.enum(["consistent", "moderate_gap", "major_gap"]),
    predicted_engagement: z.enum(["passive", "moderate", "active", "militant"]),
  }).optional(),
  coherence_score: z.number().min(0).max(100).optional(),
  coherence_breakdown: z.object({
    thought_expression_gap: z.number().min(0).max(100).optional(),
    thought_action_gap: z.number().min(0).max(100).optional(),
    expression_action_gap: z.number().min(0).max(100).optional(),
  }).optional(),
});
export type ReactionTurn = z.infer<typeof ReactionTurnSchema>;

// ============================================================================
// SIMULATIONS
// ============================================================================
export const SimulationConfigSchema = z.object({
  nAgents: z.number().int().min(1).max(1000),
  allocationMode: z.enum(["equal", "useClusterWeights"]),
  multiTurn: z.object({
    enabled: z.boolean(),
    turns: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    mediaSummaryMode: z.enum(["generated", "custom"]),
    customMediaSummary: z.string().optional(),
  }),
  influence: z.object({
    enabled: z.boolean(),
    exposurePct: z.number().min(0).max(100),
    exposureType: z.enum(["rumor", "factcheck", "mixed"]),
    exposureContentMode: z.enum(["generated", "custom"]),
    customExposureContent: z.string().optional(),
  }),
  comparativeMode: z.object({
    enabled: z.boolean(),
    options: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
    })),
    questionType: z.enum(["vote", "preference", "support"]),
  }).optional(),
});
export type SimulationConfig = z.infer<typeof SimulationConfigSchema>;

export const ReactionResultSchema = z.object({
  agentId: z.string(),
  clusterId: z.string(),
  demographics: z.object({
    ageBucketId: z.string(),
    regionId: z.string(),
    cspId: z.string(),
  }),
  exposure: z.object({
    exposed: z.boolean(),
    exposureType: z.string().optional(),
  }),
  turns: z.array(ReactionTurnSchema),
});
export type ReactionResult = z.infer<typeof ReactionResultSchema>;

export const SimulationSchema = z.object({
  id: z.string(),
  title: z.string(),
  scenario: z.string(),
  createdAt: z.string(),
  zoneId: z.string().optional(),
  clustersSnapshot: z.array(ClusterSchema),
  panelSnapshot: z.array(AgentSchema),
  config: SimulationConfigSchema,
  results: z.array(ReactionResultSchema),
  mediaSummaries: z.array(z.string()).optional(),
  exposureContent: z.string().optional(),
  executiveSummary: z.string().optional(),
});
export type Simulation = z.infer<typeof SimulationSchema>;

// ============================================================================
// POLLS
// ============================================================================
export const PollOptionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
});
export type PollOption = z.infer<typeof PollOptionSchema>;

export const PollResponseModeSchema = z.enum(["choice", "ranking", "scoring"]);
export type PollResponseMode = z.infer<typeof PollResponseModeSchema>;

export const PollConfigSchema = z.object({
  question: z.string().min(1),
  options: z.array(PollOptionSchema).min(2),
  responseMode: PollResponseModeSchema,
  zoneId: z.string(),
});

export type PollConfig = z.infer<typeof PollConfigSchema>;

export const PollResponseSchema = z.object({
  agentId: z.string(),
  clusterId: z.string(),
  response: z.union([
    // Choice mode: single option ID
    z.string(),
    // Ranking mode: array of option IDs in order
    z.array(z.string()),
    // Scoring mode: object with option ID -> score
    z.record(z.string(), z.number().min(0).max(100)),
  ]),
  reasoning: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
});

export type PollResponse = z.infer<typeof PollResponseSchema>;

export const PollResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  question: z.string(),
  options: z.array(PollOptionSchema),
  responseMode: PollResponseModeSchema,
  zoneId: z.string(),
  createdAt: z.string(),
  clustersSnapshot: z.array(ClusterSchema),
  panelSnapshot: z.array(AgentSchema),
  responses: z.array(PollResponseSchema),
  statistics: z.object({
    overall: z.object({
      choice: z.record(z.string(), z.number()).optional(), // optionId -> count
      ranking: z.array(z.object({
        optionId: z.string(),
        averageRank: z.number(),
        firstChoiceCount: z.number(),
      })).optional(),
      scoring: z.record(z.string(), z.object({
        averageScore: z.number(),
        minScore: z.number(),
        maxScore: z.number(),
        distribution: z.array(z.number()), // 0-100 buckets
      })).optional(),
    }),
    byCluster: z.record(z.string(), z.object({
      choice: z.record(z.string(), z.number()).optional(),
      ranking: z.array(z.object({
        optionId: z.string(),
        averageRank: z.number(),
        firstChoiceCount: z.number(),
      })).optional(),
      scoring: z.record(z.string(), z.object({
        averageScore: z.number(),
        minScore: z.number(),
        maxScore: z.number(),
      })).optional(),
    })),
    byDemographics: z.object({
      age: z.record(z.string(), z.record(z.string(), z.number())).optional(),
      region: z.record(z.string(), z.record(z.string(), z.number())).optional(),
      socioClass: z.record(z.string(), z.record(z.string(), z.number())).optional(),
    }).optional(),
  }),
});
export type PollResult = z.infer<typeof PollResultSchema>;
