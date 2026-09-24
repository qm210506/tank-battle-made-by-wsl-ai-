import TankGame from "@/components/TankGame";

export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <TankGame />
    </main>
  );
}
