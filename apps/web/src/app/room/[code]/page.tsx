import { Suspense } from "react";
import RoomPage from "./RoomClient";

export default function Page(props: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={
      <main className="min-h-dvh flex items-center justify-center p-6">
        <div className="card-surface p-8 text-center text-white/60">Loading…</div>
      </main>
    }>
      <RoomPage params={props.params} />
    </Suspense>
  );
}
