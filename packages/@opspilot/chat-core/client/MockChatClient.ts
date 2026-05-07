// ─────────────────────────────────────────────
//  @opspilot/chat-core  —  Mock Chat Client
//  Use for local demos / Storybook / unit tests
// ─────────────────────────────────────────────

import type { ChatClient, SseEvent } from "../types";

const MOCK_SCRIPT_EVENTS: Omit<SseEvent, "type">[] = [
  { message: "Analyzing the external shipment booking API architecture…" },
  { message: "Examining Kafka message flow patterns…" },
  { message: "Mapping topic relationships and consumer chains…" },
  { message: "Executing: kafka_topic_analysis()", metadata: { tool: "kafka_analyzer" } },
  { message: "Generating architecture flowchart…", metadata: { tool: "diagram_generator" } },
];

const KAFKA_ANALYSIS_RESPONSE = `✅ EXTERNAL SHIPMENT BOOKING API & KAFKA FLOW — ARCHITECTURE ANALYSIS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Overview
The shipment booking system is built on an asynchronous, event-driven architecture.
Instead of relying solely on synchronous REST processing, it uses Kafka as the backbone to decouple request handling, persistence, and downstream operations—making the system more scalable, resilient, and fault-tolerant.

⚙️ 1. Booking Process (High-Level Design)
The system follows a Request → Queue → Process pattern:

🚀 Flow Summary
• API receives booking request
• Message is published to Kafka
• Kafka consumers process the booking asynchronously
• Data is persisted and propagated to downstream systems

🧠 Core Processing Logic
📥 Asynchronous Consumption
ShipmentBookingMessageListener consumes messages from:
TMS_SHIPMENT_SHIPMENT_ASYNC_BOOKING

💾 Persistence Layer (saveShipment)
Handled by ShipmentBookingServiceImpl, which:
• Processes reverse shipments
• Converts VO → Entity
• Validates AWB (Air Waybill)
• Executes 4PL (Fourth Party Logistics) logic

🔄 Downstream Trigger
After persistence:
→ enqueueBookingMessageForRemote publishes events to other systems

📡 2. Kafka Topics & Message Flow

| Topic | Purpose | Key Consumer / Action |
|-------|---------|----------------------|
| TMS_SHIPMENT_SHIPMENT_ASYNC_BOOKING | Entry point for async bookings | ShipmentBookingMessageListener → DB save |
| TMS_SHIPMENT_HUB_BOOKING_UPDATE | Notify Hub Management | Listener in rest-web |
| TMS_HUB_SEARCH_BOOKING_TOPIC | Update search / MongoDB visibility | HubAndSpokeListener |
| TMS_P2P_BOOKING_PRICE_INTERNAL_TOPIC | Internal pricing calculations (P2P) | P2PBookingListenerInternal |
| TMS_P2P_AWB_DETAILS | Sync delivery details | ShipmentDeliveryDetailsKafkaConsumer |

🔄 3. End-to-End Booking Flow

📦 Booking Lifecycle
External API/Client → POST Booking Request → ShipmentBookingController
↓
Publish Message → Kafka: ASYNC_BOOKING
↓
ShipmentBookingMessageListener → saveShipment Service
↓
• Reverse Shipment Handling
• AWB Validation  
• Database Persistence
• 4PL Processing
↓
enqueueBookingMessageForRemote
↓
Downstream Topics:
• Hub Updates → Hub Service
• Search Index Update → MongoDB / Search
• Pricing Calculation → Pricing Service

📊 Summary & Key Insights
✅ Confidence Level: High
Based on Kafka listener definitions, topic usage, and service-layer implementation.

🔎 Key Findings
🛡️ Resilience (SIF Mechanism)
Failed Kafka messages are captured using a System Integration Failure (SIF) mechanism → prevents data loss

🔍 Distributed Traceability
TraceIdUtil and MDC ensure end-to-end request tracking across services

⚡ Scalability by Design
Async processing removes bottlenecks from API layer

🛠️ Recommendations
1. 📮 Implement Dead Letter Queue (DLQ)
Ensure FailedMessageProcessingException routes failed messages to a DLQ for:
• Safe retry
• Manual inspection

2. 🔁 Enforce Idempotency
Kafka can deliver duplicate messages.
• Make saveShipment idempotent
• Use awbNumber (or unique key) to prevent duplicate bookings

🧠 Key Takeaways
• Kafka is the central nervous system of the booking flow
• System prioritizes resilience, scalability, and decoupling
• Proper handling of failures and duplicates is critical in async systems

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

// Simple shipment tracking response
const SIMPLE_TRACKING_RESPONSE = "Based on my analysis, AWB123 is currently in transit and expected to arrive by tomorrow evening. The last scan was at Delhi Hub at 14:32 IST.";

const SIMPLE_SCRIPT_EVENTS: Omit<SseEvent, "type">[] = [
  { message: "Analysing your request…" },
  { message: "Searching internal knowledge base…" },
  { message: "Decided to query the TMS database." },
  { message: "Executing: tms_query(awb_number='AWB123')", metadata: { tool: "tms_query" } },
  { message: "Fetching shipment status from logistics service…", metadata: { tool: "logistics_service" } },
];

export interface MockChatClientOptions {
  /** Delay between agent steps in ms (default: 800) */
  stepDelayMs?: number;
  /** Initial typing speed in ms (default: 80) */
  initialSpeed?: number;
  /** Minimum typing speed in ms (default: 5) */
  minSpeed?: number;
  /** Speed decrease per chunk (default: 2) */
  speedDecrease?: number;
  /** Maximum chunk size (default: 3) */
  maxChunkSize?: number;
  /** Custom response text to stream. Falls back to built-in demo. */
  responseText?: string;
  /** Custom agent steps. Falls back to built-in demo. */
  agentSteps?: Omit<SseEvent, "type">[];
}

export class MockChatClient implements ChatClient {
  private readonly agentSteps: Omit<SseEvent, "type">[];
  private readonly responseText: string;
  private readonly stepDelayMs: number;
  private readonly initialSpeed: number;
  private readonly minSpeed: number;
  private readonly speedDecrease: number;
  private readonly maxChunkSize: number;

  constructor(options: MockChatClientOptions = {}) {
    this.agentSteps = options.agentSteps ?? SIMPLE_SCRIPT_EVENTS;
    this.responseText = options.responseText ?? SIMPLE_TRACKING_RESPONSE;
    this.stepDelayMs = options.stepDelayMs ?? 800;
    this.initialSpeed = options.initialSpeed ?? 80; // Start slow
    this.minSpeed = options.minSpeed ?? 8; // Don't go faster than this
    this.speedDecrease = options.speedDecrease ?? 3; // How much to accelerate each chunk
    this.maxChunkSize = options.maxChunkSize ?? 3; // Max characters per chunk
  }

  stream(input: string, onEvent: (event: SseEvent) => void): () => void {
    let cancelled = false;
    let timeouts: ReturnType<typeof setTimeout>[] = [];

    const schedule = (callback: () => void, delay: number) => {
      const timeout = setTimeout(() => {
        if (!cancelled) callback();
      }, delay);
      timeouts.push(timeout);
    };

    // Detect prompt type and choose appropriate response
    const isKafkaQuery = input.toLowerCase().includes('kafka') || 
                        input.toLowerCase().includes('booking api') || 
                        input.toLowerCase().includes('flowchart');
    
    const agentSteps = isKafkaQuery ? MOCK_SCRIPT_EVENTS : this.agentSteps;
    const responseText = isKafkaQuery ? KAFKA_ANALYSIS_RESPONSE : this.responseText;

    let currentTime = 0;

    // 1. Agent thinking/decision/tool steps
    agentSteps.forEach((step, i) => {
      const stepType = i < 2 ? "THINKING" : i === 2 ? "DECISION" : "TOOL_EXECUTION";
      schedule(() => {
        onEvent({ type: stepType, ...step });
      }, currentTime);
      currentTime += this.stepDelayMs;
    });

    // 2. Stream response text with accelerating chunks (like ChatGPT)
    let buffer = responseText;
    let speed = this.initialSpeed;
    let chunkTime = 0;
    
    while (buffer.length > 0) {
      // Take chunk (not single char) - up to maxChunkSize
      const chunkSize = Math.min(this.maxChunkSize, buffer.length);
      const chunk = buffer.slice(0, chunkSize);
      buffer = buffer.slice(chunkSize);
      
      schedule(() => {
        onEvent({ 
          type: "STREAM_CHUNK", 
          chunk: chunk 
        });
      }, currentTime + chunkTime);
      
      chunkTime += speed;
      
      // 🔥 Accelerate over time (decrease delay)
      if (speed > this.minSpeed) {
        speed = Math.max(this.minSpeed, speed - this.speedDecrease);
      }
    }

    // 3. Mark as completed
    currentTime += chunkTime + 200;
      schedule(() => {
        onEvent({ 
          type: "COMPLETED", 
          result: responseText 
        });
      }, currentTime);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
      timeouts = [];
    };
  }
}