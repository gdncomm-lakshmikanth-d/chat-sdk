import React from 'react';

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
          ✅ OpsPilot Chat SDK - Simple Test
        </h1>
        
        <p style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: '1.2rem',
          margin: 0
        }}>
          If you see this, React is working correctly!
          <br />
          The issue was likely with workspace package imports.
        </p>

        <div style={{ 
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '10px'
        }}>
          <h3 style={{ color: 'white', margin: 0, marginBottom: '1rem' }}>
            Next Steps:
          </h3>
          <ul style={{
            color: 'rgba(255,255,255,0.8)',
            textAlign: 'left',
            lineHeight: 1.8
          }}>
            <li>The workspace packages needed proper build configuration</li>
            <li>Package.json exports were pointing to non-existent files</li>
            <li>Vite aliases needed to point to built dist files</li>
            <li>Now we can restore the full OpsPilot Chat SDK demo</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;