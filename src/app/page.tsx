import Hero from "./components/Hero";
import Features from "./components/Features";
import BottomIllustration from "./components/BottomIllustration";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100">
      <Hero />
      <Features />
      <BottomIllustration />
    </div>
  );
}
