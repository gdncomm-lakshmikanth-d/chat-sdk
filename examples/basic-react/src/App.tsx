import React, { useState } from 'react';
import { MockChatClient, createChatClient, createAgentChatClient, AgentChatClient } from '@opspilot/chat-core';

// Imports are working correctly
console.log('🔥 App.tsx loaded - timestamp:', new Date().toISOString());
import { OpsPilotChat } from '@opspilot/chat-react';

function App() {
  const [clientType, setClientType] = useState<'mock' | 'agent' | 'real'>('agent');
  
  // Create clients
  const mockClient = new MockChatClient({
    stepDelayMs: 1200,      // Delay between agent steps (thinking, decision, etc.)
    initialSpeed: 150,      // Start slow (150ms per chunk)
    minSpeed: 12,          // Accelerate down to 12ms per chunk
    speedDecrease: 3,      // Reduce delay by 3ms each chunk (acceleration)
    maxChunkSize: 4,       // 1-4 characters per chunk
  });

  // Agent API client for your endpoint
  const agentClient = createAgentChatClient({
    baseUrl: import.meta.env.VITE_AGENT_API_BASE_URL || "http://localhost:9095",
    team: import.meta.env.VITE_AGENT_API_TEAM || "gdn-tms",
    // headers: { 
    //   "Authorization": `Bearer ${import.meta.env.VITE_AGENT_API_TOKEN}` // Add if needed
    // }
  });

  // For other SSE backends, you would use the generic client
  const realClient = createChatClient({
    baseUrl: "https://api.example.com", // Replace with your actual backend
    headers: { 
      "Authorization": `Bearer ${import.meta.env.VITE_API_TOKEN}` // Add your auth token
    }
  });

  const client = clientType === 'mock' ? mockClient : 
                 clientType === 'agent' ? agentClient : realClient;

  // Client selection logic

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '2rem',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <h1 style={{
          color: 'white',
          fontSize: '2.5rem',
          fontWeight: 700,
          margin: 0,
          marginBottom: '0.5rem',
          textAlign: 'center'
        }}>
          OpsPilot Chat SDK
        </h1>
        
        <p style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: '1.2rem',
          textAlign: 'center',
          margin: 0,
          marginBottom: '2rem'
        }}>
          Demo of the premium chat interface with streaming AI responses
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ color: 'white', margin: 0, marginBottom: '1rem' }}>
            Client Type
          </h3>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setClientType('mock')}
              style={{
                background: clientType === 'mock' ? '#7c6af7' : 'rgba(255,255,255,0.1)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 200ms'
              }}
            >
              Mock Client (Demo)
            </button>
            
            <button
              onClick={() => setClientType('agent')}
              style={{
                background: clientType === 'agent' ? '#7c6af7' : 'rgba(255,255,255,0.1)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 200ms'
              }}
            >
              Agent API
            </button>
            
            <button
              onClick={() => setClientType('real')}
              style={{
                background: clientType === 'real' ? '#7c6af7' : 'rgba(255,255,255,0.1)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 200ms'
              }}
            >
              Other SSE API
            </button>
          </div>
          
          {clientType === 'agent' && (
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.9rem',
              margin: '1rem 0 0 0'
            }}>
              ✅ Configured for your Agent API (create .env file from .env.example for custom configuration)
            </p>
          )}
          
          {clientType === 'real' && (
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.9rem',
              margin: '1rem 0 0 0'
            }}>
              ⚠️ Configure your backend URL in App.tsx for other SSE APIs to work
            </p>
          )}
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h3 style={{ color: 'white', margin: 0, marginBottom: '1rem' }}>
            Features Demo
          </h3>
          
          <ul style={{
            color: 'rgba(255,255,255,0.8)',
            lineHeight: 1.6,
            margin: 0,
            paddingLeft: '1.5rem'
          }}>
            <li>Click the floating chat button (bottom right)</li>
            <li>Send a message to see streaming responses</li>
            <li>Watch agent execution steps in the "Steps" tab</li>
            <li>Try dragging the left edge to resize the panel</li>
            <li>Use the expand button to go fullscreen</li>
            <li>Test the stop button during streaming</li>
          </ul>
        </div>
      </div>

      {/* The OpsPilot Chat Component - key forces recreation when client changes */}
      <OpsPilotChat
        key={clientType} // This forces React to completely recreate the component when clientType changes
        client={client}
        title="AI Assistant Demo"
        showSteps={true}
        defaultWidth="400px"
        minWidth={350}
        maxWidth="60%"
        placeholder={clientType === 'agent' 
          ? "Try asking: 'Explain external shipment booking api along with kafka flow'"
          : "Try asking: 'What is the status of AWB123?'"
        }
      />
    </div>
  );
}

export default App;