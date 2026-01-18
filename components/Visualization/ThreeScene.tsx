"use client";

import { useRef, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { SpatialCluster, OpinionBridge } from "@/lib/core/spatialData";

interface ClusterSphereProps {
  cluster: SpatialCluster;
  isSelected: boolean;
  onClick: () => void;
}

function ClusterSphere({ cluster, isSelected, onClick }: ClusterSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Calculate size based on agent count
  const baseSize = Math.sqrt(cluster.agentCount) * 0.3 + 0.5;
  const size = isSelected ? baseSize * 1.3 : hovered ? baseSize * 1.1 : baseSize;
  
  // Calculate color based on sentiment (-1 to 1)
  const getColor = (sentiment: number): string => {
    if (sentiment < -0.3) {
      return "#e63946"; // Red for negative
    } else if (sentiment < 0.3) {
      return "#f4a261"; // Orange for neutral
    } else {
      return "#2a9d8f"; // Green for positive
    }
  };
  
  const color = getColor(cluster.sentiment);
  
  // Rotation animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003;
      if (isSelected) {
        meshRef.current.position.y = cluster.position.y + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
    }
  });

  return (
    <group position={[cluster.position.x, cluster.position.y, cluster.position.z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        scale={size}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.5 : hovered ? 0.3 : 0.1}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      
      {/* Glow effect for selected */}
      {isSelected && (
        <mesh scale={size * 1.2}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.2}
          />
        </mesh>
      )}
      
      {/* Label */}
      {(hovered || isSelected) && (
        <Html
          position={[0, size + 0.5, 0]}
          center
          style={{
            pointerEvents: "none",
          }}
        >
          <div className="bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20 whitespace-nowrap">
            <p className="text-white text-sm font-semibold">{cluster.name}</p>
            <p className="text-gray-400 text-xs">{cluster.agentCount} agents</p>
          </div>
        </Html>
      )}
    </group>
  );
}

function ParticleField() {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 200;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return pos;
  }, []);
  
  useFrame(() => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.0003;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#667eea"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

function GridFloor() {
  return (
    <group position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <gridHelper args={[30, 30, "#333333", "#222222"]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

interface BridgeLineProps {
  bridge: OpinionBridge;
  clusters: SpatialCluster[];
  showBridges: boolean;
}

function BridgeLine({ bridge, clusters, showBridges }: BridgeLineProps) {
  const sourceCluster = clusters.find(c => c.id === bridge.sourceId);
  const targetCluster = clusters.find(c => c.id === bridge.targetId);
  
  if (!sourceCluster || !targetCluster || !showBridges) return null;
  
  // Only show moderate and strong bridges
  if (bridge.bridgeType === "weak") return null;
  
  const points: [number, number, number][] = [
    [sourceCluster.position.x, sourceCluster.position.y, sourceCluster.position.z],
    [targetCluster.position.x, targetCluster.position.y, targetCluster.position.z],
  ];
  
  // Color based on bridge strength
  const color = bridge.bridgeType === "strong" ? "#4ade80" : "#fbbf24";
  const opacity = bridge.bridgeType === "strong" ? 0.6 : 0.4;
  const lineWidth = bridge.bridgeType === "strong" ? 2 : 1;
  
  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      dashed={bridge.bridgeType === "moderate"}
      dashScale={2}
      dashSize={0.5}
      gapSize={0.3}
    />
  );
}

function Scene({ clusters, bridges, selectedClusterId, onSelectCluster, showBridges }: {
  clusters: SpatialCluster[];
  bridges: OpinionBridge[];
  selectedClusterId: string | null;
  onSelectCluster: (id: string) => void;
  showBridges: boolean;
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#667eea" />
      <spotLight
        position={[0, 15, 0]}
        angle={0.5}
        penumbra={1}
        intensity={0.5}
        color="#764ba2"
      />
      
      {/* Background elements */}
      <ParticleField />
      <GridFloor />
      
      {/* Opinion bridges (lines between clusters) */}
      {bridges.map((bridge, index) => (
        <BridgeLine
          key={`bridge-${index}`}
          bridge={bridge}
          clusters={clusters}
          showBridges={showBridges}
        />
      ))}
      
      {/* Cluster spheres */}
      {clusters.map((cluster) => (
        <ClusterSphere
          key={cluster.id}
          cluster={cluster}
          isSelected={selectedClusterId === cluster.id}
          onClick={() => onSelectCluster(cluster.id)}
        />
      ))}
      
      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

interface ThreeSceneProps {
  clusters: SpatialCluster[];
  bridges: OpinionBridge[];
  selectedClusterId: string | null;
  onSelectCluster: (id: string) => void;
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#667eea" />
    </mesh>
  );
}

export default function ThreeScene({ clusters, bridges, selectedClusterId, onSelectCluster }: ThreeSceneProps) {
  const [showBridges, setShowBridges] = useState(true);
  
  // Check if we have valid data
  if (!clusters || clusters.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-b from-[#0a0a0f] to-[#1a1a2e] rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No clusters to display</p>
        </div>
      </div>
    );
  }

  const strongBridges = bridges.filter(b => b.bridgeType === "strong").length;
  const moderateBridges = bridges.filter(b => b.bridgeType === "moderate").length;

  return (
    <div className="w-full h-full bg-gradient-to-b from-[#0a0a0f] to-[#1a1a2e] rounded-lg overflow-hidden relative">
      <Canvas
        camera={{ position: [0, 5, 15], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, 2]}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene
            clusters={clusters}
            bridges={bridges}
            selectedClusterId={selectedClusterId}
            onSelectCluster={onSelectCluster}
            showBridges={showBridges}
          />
        </Suspense>
      </Canvas>
      
      {/* Controls overlay */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm p-3 rounded-lg border border-white/10">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showBridges}
            onChange={(e) => setShowBridges(e.target.checked)}
            className="w-4 h-4 rounded bg-white/10 border-white/20"
          />
          <span className="text-white text-xs">Show Opinion Bridges</span>
        </label>
      </div>
      
      {/* Legend overlay */}
      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm p-4 rounded-lg border border-white/10">
        <h4 className="text-white text-xs font-semibold mb-2">3D OPINION MAP</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "linear-gradient(90deg, #e63946, #f4a261, #2a9d8f)" }} />
            <span className="text-gray-400">Color: Sentiment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white/30" />
            <span className="text-gray-400">Size: Agent Count</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">↔</span>
            <span className="text-gray-400">Distance: Similarity</span>
          </div>
          {showBridges && (
            <>
              <div className="border-t border-white/10 my-2 pt-2">
                <span className="text-gray-500 text-[10px]">OPINION BRIDGES</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-green-400" />
                <span className="text-gray-400">Strong ({strongBridges})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-yellow-400 opacity-60" style={{ backgroundImage: "repeating-linear-gradient(90deg, #fbbf24 0, #fbbf24 4px, transparent 4px, transparent 8px)" }} />
                <span className="text-gray-400">Moderate ({moderateBridges})</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
