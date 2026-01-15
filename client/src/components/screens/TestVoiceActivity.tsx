import React, { useState } from 'react';
import { StickFigurePersona } from '@/components/game/StickFigurePersona';
import type { Player } from '@/types/game';

export const TestVoiceActivity: React.FC = () => {
  // Mock players - including long nicknames to test truncation
  const mockPlayers: Player[] = [
    { id: '1', username: 'Олександр' },
    { id: '2', username: 'PowerOf10kSuns' },
    { id: '3', username: 'Іван' },
    { id: '4', username: 'xXDarkKnight99Xx' },
    { id: '5', username: 'Дмитро' },
    { id: '6', username: 'TheLegend27' },
  ];

  // Split players into teams
  const teamAPlayers = mockPlayers.slice(0, 3);
  const teamBPlayers = mockPlayers.slice(3, 6);

  // Track who is speaking
  const [speakingPlayers, setSpeakingPlayers] = useState<Set<string>>(new Set());

  // Track background visibility
  const [showBackground, setShowBackground] = useState(false);

  const toggleSpeaking = (playerId: string) => {
    setSpeakingPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  const isPlayerSpeaking = (playerId: string): boolean => {
    return speakingPlayers.has(playerId);
  };

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        minHeight: '100vh',
        background: showBackground
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : '#ffffff',
        transition: 'background 0.3s ease',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: showBackground ? '#fff' : '#000' }}>Voice Activity Panel Test</h1>
        <p style={{ color: showBackground ? '#fff' : '#666' }}>
          Click on stick figures or use buttons below to toggle speaking animation
        </p>

        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setShowBackground(!showBackground)}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: showBackground ? '#ffc107' : '#6c757d',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            {showBackground ? '🎨 Hide Background' : '🎨 Show Background'}
          </button>
          <span style={{ marginLeft: '10px', color: showBackground ? '#fff' : '#666' }}>
            (Toggle to see panel on different backgrounds)
          </span>
        </div>
      </div>

      {/* Voice Activity Panel */}
      <div className="voice-activity-panel">
        {/* Team A Section */}
        {teamAPlayers.length > 0 && (
          <div className="team-section team-a-section">
            <div className="team-label team-a-label">Команда А</div>
            <div className="team-players">
              {teamAPlayers.map((player: Player) => (
                <div
                  key={player.id}
                  onClick={() => toggleSpeaking(player.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <StickFigurePersona
                    player={player}
                    teamColor="teamA"
                    isSpeaking={isPlayerSpeaking(player.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {teamAPlayers.length > 0 && teamBPlayers.length > 0 && <div className="team-divider" />}

        {/* Team B Section */}
        {teamBPlayers.length > 0 && (
          <div className="team-section team-b-section">
            <div className="team-label team-b-label">Команда Б</div>
            <div className="team-players">
              {teamBPlayers.map((player: Player) => (
                <div
                  key={player.id}
                  onClick={() => toggleSpeaking(player.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <StickFigurePersona
                    player={player}
                    teamColor="teamB"
                    isSpeaking={isPlayerSpeaking(player.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div
        style={{
          marginTop: '100px',
          textAlign: 'center',
          maxWidth: '1200px',
          margin: '100px auto 0',
        }}
      >
        <h2 style={{ color: showBackground ? '#fff' : '#000' }}>Test Controls</h2>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {mockPlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => toggleSpeaking(player.id)}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isPlayerSpeaking(player.id) ? '#28a745' : '#6c757d',
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              {player.username} {isPlayerSpeaking(player.id) ? '🔊' : '🔇'}
            </button>
          ))}
        </div>

        <div style={{ marginTop: '20px' }}>
          <button
            onClick={() => setSpeakingPlayers(new Set(mockPlayers.map((p) => p.id)))}
            style={{
              padding: '10px 30px',
              fontSize: '14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: '#007bff',
              color: 'white',
              fontWeight: 'bold',
              marginRight: '10px',
            }}
          >
            All Speak
          </button>
          <button
            onClick={() => setSpeakingPlayers(new Set())}
            style={{
              padding: '10px 30px',
              fontSize: '14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: '#dc3545',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            All Silent
          </button>
        </div>

        <div style={{ marginTop: '20px', color: showBackground ? '#fff' : '#666' }}>
          <p>Currently speaking: {speakingPlayers.size} player(s)</p>
        </div>
      </div>

      {/* Info */}
      <div
        style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: showBackground ? 'rgba(255, 255, 255, 0.1)' : '#f8f9fa',
          borderRadius: '8px',
          maxWidth: '1200px',
          margin: '40px auto 0',
          backdropFilter: showBackground ? 'blur(10px)' : 'none',
        }}
      >
        <h3 style={{ color: showBackground ? '#fff' : '#000' }}>UI Improvements:</h3>
        <ul style={{ color: showBackground ? '#fff' : '#000', textAlign: 'left' }}>
          <li>✅ Simple smiling faces instead of stick figures (bigger and clearer)</li>
          <li>✅ Visible mouth animation: closed smile → open mouth when speaking</li>
          <li>✅ 60x60 SVG size (square faces for better visibility)</li>
          <li>✅ Smooth opacity transitions and pulsing animation</li>
          <li>✅ Team color coding (blue for Team A, red for Team B)</li>
          <li>✅ Handles long nicknames (up to 120px with ellipsis truncation)</li>
          <li>✅ Responsive design for mobile and tablet</li>
          <li>✅ Shows on all screens when players are connected</li>
        </ul>

        <div
          style={{
            marginTop: '15px',
            padding: '12px',
            backgroundColor: showBackground ? 'rgba(255, 255, 255, 0.15)' : '#e9ecef',
            borderRadius: '6px',
            color: showBackground ? '#fff' : '#495057',
          }}
        >
          <strong>Long Nickname Testing:</strong>
          <p style={{ marginTop: '8px', fontSize: '14px' }}>
            Team A includes "PowerOf10kSuns" and Team B includes "xXDarkKnight99Xx" and
            "TheLegend27" to test how the UI handles longer player names. Names exceeding the
            max-width are truncated with ellipsis (...) while maintaining layout integrity.
          </p>
        </div>

        <div style={{ marginTop: '20px', color: showBackground ? '#fff' : '#666' }}>
          <strong>How to test:</strong>
          <ol style={{ textAlign: 'left', marginTop: '10px' }}>
            <li>Click any stick figure to toggle speaking animation</li>
            <li>Use control buttons to test multiple players speaking</li>
            <li>Toggle background to see panel visibility</li>
            <li>Resize browser window to test responsive design</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
