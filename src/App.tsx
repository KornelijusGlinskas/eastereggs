import React, { useRef, useState, useMemo, useEffect, SetStateAction, Dispatch } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import './App.css';

// Egg definitions: color and Lithuanian task
const eggData = [
  {
    color: '#FFB300',
    title: 'Auksinis kiaušinis',
    story: 'Auksinis kiaušinis glūdi Sauliaus Steponavičiaus lobynuose ir spinduliuoja amžino pavasario džiaugsmą.',
    task: 'Nupiešk paprastą kryžių.'
  },
  {
    color: '#FFC0CB',
    title: 'Rožinis kiaušinis',
    story: 'Rožinio aušros spalva primena Kernavės piliakalnių ramybę ir senolių dainas.',
    task: 'Nupiešk piliakalnį.'
  },
  {
    color: '#228B22',
    title: 'Žalias kiaušinis',
    story: 'Žalias kiaušinis alsuoja Dzūkijos pušynų vėsa ir miško paslaptimis po pavasario lietaus.',
    task: 'Nupiešk medžio šaką.'
  },
  {
    color: '#87CEEB',
    title: 'Mėlynas kiaušinis',
    story: 'Mėlynas kiaušinis primena Baltijos jūros bangas ir vėjo šnarėjimą prie Kuršių nerijos.',
    task: 'Nupiešk laivelį.'
  },
  {
    color: '#FFD700',
    title: 'Geltonas kiaušinis',
    story: 'Geltonas kiaušinis šviečia kaip saulė virš vienkiemio laukuose ir skleidžia derliaus pažadą.',
    task: 'Nupiešk laukuose šviečiančią saulę.'
  },
  {
    color: '#8B0000',
    title: 'Raudonas kiaušinis',
    story: 'Raudonas kiaušinis alsuoja Trakų pilies drąsa ir karališkųjų puotų aistromis.',
    task: 'Nupiešk pilį.'
  },
  {
    color: '#9370DB',
    title: 'Purpurinis kiaušinis',
    story: 'Purpurinis kiaušinis slepia Jogailos dinastijos magiją ir karališką karūną.',
    task: 'Nupiešk karūną.'
  },
  {
    color: '#000000',
    title: 'Juodas kiaušinis',
    story: 'Juodas kiaušinis atspindi vidurnakčio dangų virš Šatrijos kalno su žvaigždžių legendomis.',
    task: 'Nupiešk kalną naktį.'
  }
];


type Vec3 = [number, number, number];
type EggDataType = typeof eggData[0]; // Define a type for egg data structure

// Single egg component
function Egg({ color, position, onCrack, isSelected }: { color: string; position: Vec3; onCrack: () => void; isSelected: boolean }) {
  const mesh = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  useFrame(() => {
    // slow constant spin
    mesh.current.rotation.y += 0.02;
    // smooth raise or lower selected egg
    const baseY = position[1];
    const targetY = isSelected ? baseY + 0.5 : baseY;
    mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, targetY, 0.1);
    // smooth scale based on state
    const targetScale = isSelected ? 1.2 : hovered ? 1.1 : 1;
    const currentScale = mesh.current.scale.x;
    const s = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
    mesh.current.scale.set(s, s * 1.3, s);
  });
  return (
    <mesh
      ref={mesh}
      position={position}
      onPointerDown={onCrack}
      onPointerUp={onCrack}
      onClick={onCrack}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      castShadow
    >
      <sphereGeometry args={[0.8, 32, 32]} />
      <meshStandardMaterial
        color={color}
        metalness={isSelected ? 0.9 : 0.5}
        roughness={isSelected ? 0.1 : 0.5}
        emissive={new THREE.Color(color)}
        emissiveIntensity={isSelected ? 1.2 : 0.4}
      />
    </mesh>
  );
}

// Dropped model placeholder (a simple box)
function Droplet({ position }: { position: Vec3 }) {
  const ref = useRef<THREE.Mesh>(null!);
  const [t, setT] = useState(0);
  useFrame((_, delta) => {
    setT((v) => Math.min(1, v + delta));
    const startY = position[1] + 2;
    const endY = position[1] + 0.2;
    if (ref.current) {
      ref.current.position.y = THREE.MathUtils.lerp(startY, endY, t);
      ref.current.rotation.x += delta;
      ref.current.rotation.y += delta;
    }
  });
  return (
    <mesh ref={ref} position={[position[0], position[1] + 2, position[2]]} castShadow>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color="white" />
    </mesh>
  );
}

// New component to handle the 3D scene elements and interactions
function EggScene({
  positions,
  dropped,
  setDropped,
  selectedEgg,
  setSelectedEgg
}: {
  positions: Vec3[];
  dropped: number[];
  setDropped: Dispatch<SetStateAction<number[]>>;
  selectedEgg: number | null;
  setSelectedEgg: Dispatch<SetStateAction<number | null>>;
}) {
  const { camera } = useThree();

  const handleCrack = (i: number) => {
    // Calculate camera angle in XZ plane
    const cameraAngle = Math.atan2(camera.position.z, camera.position.x);
    
    // Calculate egg angle in XZ plane
    const eggAngle = i * (2 * Math.PI) / eggData.length;

    // Calculate the difference in angles
    let angleDiff = eggAngle - cameraAngle;

    // Normalize the angle difference to be between -PI and PI
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

    // Define the threshold angle (e.g., +/- 72 degrees or PI / 2.5)
    const thresholdAngle = Math.PI / 2.5; 

    // Only proceed if the egg is within the threshold angle (in front)
    if (Math.abs(angleDiff) < thresholdAngle) {
      // drop egg once
      if (!dropped.includes(i)) {
        setDropped(prev => [...prev, i]);
      }
      // show selection drawer
      setSelectedEgg(i);
      // NOTE: Timeout logic removed here
    } else {
      console.log(`Egg ${i} is behind, not selecting.`);
      // Optionally provide feedback or do nothing
    }
  };

  return (
    <>
      {/* Scene background & environment */}
      <color attach="background" args={[ '#f5f0e1' ]} />
      <fog attach="fog" args={[ '#f5f0e1', 5, 15 ]} />
      <Environment preset="sunset" background={false} />
      
      {/* Lights */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      
      {/* Soft contact shadows under objects */}
      <ContactShadows position={[0, -0.01, 0]} opacity={0.6} width={10} height={10} blur={1} far={5} />

      {eggData.map((egg, i) => (
        <Egg
          key={i}
          color={egg.color}
          position={positions[i]}
          onCrack={() => handleCrack(i)}
          isSelected={selectedEgg === i}
        />
      ))}

      {dropped.map((i) => (
        <Droplet key={i} position={positions[i]} />
      ))}

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="black" transparent opacity={0.2} />
      </mesh>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        // lock vertical rotation to horizontal plane
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

export default function App() {
  // Track which eggs have been cracked
  const [dropped, setDropped] = useState<number[]>([]);
  // Currently selected egg for dialog
  const [selectedEgg, setSelectedEgg] = useState<number | null>(null);
  // Zoom level controlled by horizontal scroll
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setZoom(z => THREE.MathUtils.clamp(z + e.deltaX * 0.001, 0.5, 2));
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  // Precompute positions on a circle
  const positions = useMemo<Vec3[]>(() => {
    const radius = 3;
    const yOffset = 1.0;
    const step = (2 * Math.PI) / eggData.length;
    return eggData.map((_, i) => [radius * Math.cos(i * step), yOffset, radius * Math.sin(i * step)]);
  }, []);

  return (
    <div className="canvas-container">
      {/* Persistent game title */}
      <div className="game-title">Margučių lenktynės pas Glinskus '25</div>
      <Canvas
        shadows
        dpr={[1, window.devicePixelRatio]}
        gl={{ antialias: true }}  
        style={{ touchAction: 'none' }}
        camera={{ position: [0, 5, 10], fov: 50 }}
      >
        {/* Pass state and setters to the new scene component */}
        <EggScene 
          positions={positions}
          dropped={dropped}
          setDropped={setDropped}
          selectedEgg={selectedEgg}
          setSelectedEgg={setSelectedEgg}
        />
        
        {/* Zoom camera based on scroll */}
        <ZoomController zoom={zoom} />
      </Canvas>
      {/* Bottom drawer for selected egg */}
      {selectedEgg !== null && (
        <div
          className="bottom-drawer"
          style={{ background: eggData[selectedEgg].color }}
        >
          <p className="story">{eggData[selectedEgg].story}</p>
          <p className="task"><strong>Užduotis:</strong> {eggData[selectedEgg].task}</p>
        </div>
      )}
    </div>
  );
}

// Component to adjust camera for horizontal scroll zoom
function ZoomController({ zoom }: { zoom: number }) {
  const { camera } = useThree();
  useEffect(() => {
    // adjust camera Z position
    camera.position.set(0, 5, 10 / zoom);
    camera.updateProjectionMatrix();
  }, [zoom, camera]);
  return null;
}
