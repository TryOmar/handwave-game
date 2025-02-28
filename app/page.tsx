import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-white">
      <Card className="w-full max-w-md border border-white/10 bg-black">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-white">HandWave</CardTitle>
          <CardDescription className="text-lg text-white/60">Dodge obstacles and survive!</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Link href="/single-player" className="w-full">
            <Button variant="outline" className="w-full border border-white/10 bg-black text-white hover:bg-white/5">
              Single Player
            </Button>
          </Link>
          <Button variant="outline" className="w-full border border-white/10 bg-black text-white/50 cursor-not-allowed">
            Multiplayer (Coming Soon)
          </Button>
          <p className="text-center text-sm text-white/60">Made with ❤️ by Omar Abbas</p>
        </CardContent>
      </Card>
    </div>
  )
}

