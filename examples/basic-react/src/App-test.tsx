import React, { useState } from 'react';

// Test the imports one by one
console.log('🔥 App-test.tsx loaded - timestamp:', new Date().toISOString());

// First, test importing the core package
try {
  const { MockChatClient, createChatClient, createAgentChatClient } = require('@opspilot/chat-core');
  console.log('✅ @opspilot/chat-core imported successfully:', { MockChatClient, createChatClient, createAgentChatClient });
} catch (error) {
  console.error('❌ @opspilot/chat-core import failed:', error);
}

// Second, test importing the React package
try {
  const { OpsPilotChat } = require('@opspilot/chat-react');
  console.log('✅ @opspilot/chat-react imported successfully:', { OpsPilotChat });
} catch (error) {
  console.error('❌ @opspilot/chat-react import failed:', error);
}

function App() {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        maxWidth: '800px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '2rem',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        textAlign: 'center'
      }}>
        <h1 style={{
          color: 'white',
          fontSize: '2.5rem',
          fontWeight: 700,
          margin: 0,
          marginBottom: '1rem'
        }}>
          🧪 Testing Package Imports
        </h1>
        
        <p style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: '1.2rem',
          margin: 0,
          marginBottom: '2rem'
        }}>
          Check the browser console (F12) to see import results
        </p>

        <div style={{ 
          padding: '1rem',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '10px',
          textAlign: 'left'
        }}>
          <pre style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.9rem',
            margin: 0,
            overflow: 'auto'
          }}>
{`Console should show:
✅ @opspilot/chat-core imported successfully
✅ @opspilot/chat-react imported successfully

If you see ❌ errors, the workspace
packages are not properly configured.`}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default App;