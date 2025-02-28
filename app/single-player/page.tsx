import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default function SinglePlayerPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-white">
      <Card className="w-full max-w-md border border-white/20 bg-black">
        <CardHeader className="text-center relative pb-6">
          <div className="absolute left-4 top-4">
            <Link href="/">
              <Button
                variant="outline"
                size="icon"
                className="border border-white/20 bg-black text-white hover:bg-white hover:text-black transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <CardTitle className="text-3xl font-bold text-white">Choose Your Control</CardTitle>
          <CardDescription className="text-lg text-white/60">How would you like to play?</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-6">
          <Link href="/maps?mode=keyboard" className="w-full">
            <Button
              variant="outline"
              className="w-full h-12 border border-white/20 bg-black text-white hover:bg-white hover:text-black transition-colors text-lg font-medium"
            >
              Play with Keyboard
            </Button>
          </Link>
          <Link href="/maps?mode=camera" className="w-full">
            <Button
              variant="outline"
              className="w-full h-12 border border-white/20 bg-black text-white hover:bg-white hover:text-black transition-colors text-lg font-medium"
            >
              Play with Camera
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

