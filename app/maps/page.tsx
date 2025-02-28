"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { FlagIcon, LockIcon, ArrowLeft } from "lucide-react"

export default function MapsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = searchParams.get("mode") || "keyboard"
  const [progress, setProgress] = useState<Record<string, Record<string, number>>>({
    keyboard: { map1: 0, map2: 0, map3: 0, map4: 0 },
    camera: { map1: 0, map2: 0, map3: 0, map4: 0 },
  })

  useEffect(() => {
    // Load progress from local storage
    const savedProgress = localStorage.getItem("handwave-progress")
    if (savedProgress) {
      setProgress(JSON.parse(savedProgress))
    }
  }, [])

  if (!["keyboard", "camera"].includes(mode)) {
    router.push("/single-player")
    return null
  }

  const maps = [
    { id: "map1", name: "Map 1", locked: false },
    { id: "map2", name: "Map 2", locked: progress[mode].map1 < 100 },
    { id: "map3", name: "Map 3", locked: progress[mode].map2 < 100 },
    { id: "map4", name: "Map 4", locked: progress[mode].map3 < 100 },
  ]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-white">
      <Card className="w-full max-w-3xl border border-white/20 bg-black">
        <CardHeader className="text-center relative pb-6">
          <div className="absolute left-4 top-4">
            <Link href="/single-player">
              <Button
                variant="outline"
                size="icon"
                className="border border-white/20 bg-black text-white hover:bg-white hover:text-black transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <CardTitle className="text-3xl font-bold text-white">Select a Map</CardTitle>
          <CardDescription className="text-lg text-white/60">
            {mode === "keyboard" ? "Keyboard" : "Camera"} Mode
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          {maps.map((map) => (
            <Card
              key={map.id}
              className={`border transition-all duration-300 ${
                map.locked ? "border-white/5 bg-black/50 opacity-50" : "border-white/20 bg-black hover:border-white/40"
              }`}
            >
              <CardHeader className="p-4">
                <CardTitle className="flex items-center justify-between text-xl">
                  <span className={map.locked ? "text-white/40" : "text-white"}>{map.name}</span>
                  {map.locked ? (
                    <LockIcon className="h-5 w-5 text-white/40" />
                  ) : (
                    <FlagIcon className="h-5 w-5 text-white" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="mb-2 text-sm text-white/60">Progress: {progress[mode][map.id]}%</div>
                <Progress
                  value={progress[mode][map.id]}
                  className="h-2 bg-white/10"
                  indicatorClassName="bg-white transition-all"
                />
                {map.locked ? (
                  <Button
                    disabled
                    className="w-full mt-4 bg-white/5 text-white/40 cursor-not-allowed border border-white/10"
                  >
                    Locked
                  </Button>
                ) : (
                  <Link href={`/game?mode=${mode}&map=${map.id}`} className="w-full">
                    <Button className="w-full mt-4 bg-white text-black hover:bg-white/90 transition-colors">
                      Play
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

