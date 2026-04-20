import React from 'react';
import { Stage } from '@/lib/animations.jsx';
import { TERRA, SceneColdOpen, SceneManifesto, SceneStats, SceneResults, SceneCTA } from '@/lib/scenes.jsx';

export default function ReceptionistPortrait() {
  return (
    <div style={{ position: 'relative', width: '100%', height: 520, background: TERRA.bg }}>
      <Stage
        width={720}
        height={1280}
        duration={20}
        background={TERRA.bg}
        loop={true}
        autoplay={true}
        persistKey="terra-receptionist-portrait"
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
