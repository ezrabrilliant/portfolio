export function World() {
  return (
    <>
      <color attach="background" args={["#cbdce4"]} />
      <ambientLight intensity={0.8} />
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#8ea769" />
      </mesh>
    </>
  );
}
