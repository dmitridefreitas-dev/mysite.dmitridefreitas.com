import React from 'react';
import { Stage } from '@/lib/animations.jsx';
import { TERRA, SceneColdOpen, SceneManifesto, SceneStats, SceneResults, SceneCTA } from '@/lib/scenes.jsx';

export default function Receptionist() {
  return (
    <div style={{ position: 'relative', width: '100%', height: 480, background: TERRA.bg }}>
      <Stage
        width={1280}
        height={720}
        duration={20}
        background={TERRA.bg}
        loop={true}
        autoplay={true}
        persistKey="terra-receptionist"
      >
        <SceneColdOpen start={0} end={4.0} />
        <SceneManifesto start={2.8} end={6.6} />
        <SceneStats start={6.6} end={10.8} />
        <SceneResults start={10.8} end={15.6} />
        <SceneCTA start={15.6} end={20.0} />
      </Stage>
    </div>
  );
}
