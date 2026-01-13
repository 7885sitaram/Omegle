'use client'

import { useEffect, useRef } from "react"

function Video({ roomId }: { roomId: string }) {
    const zpRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const start = async () => {
            if (!containerRef.current) return

            const { ZegoUIKitPrebuilt } = await import("@zegocloud/zego-uikit-prebuilt")

            const userId = crypto.randomUUID()

            const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                Number(process.env.NEXT_PUBLIC_ZEGO_APP_ID),
                process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET!,
                roomId,
                userId,
                "stranger"
            )

            const zp = ZegoUIKitPrebuilt.create(kitToken)
            zpRef.current = zp

            zp.joinRoom({
                container: containerRef.current,
                scenario: {
                    mode: ZegoUIKitPrebuilt.OneONoneCall,
                },
                showPreJoinView: false,
                showTextChat: true,
                maxUsers: 2,
            })
        }

        start()

        return () => {
            zpRef.current?.destroy()

            // if (zpRef.current) {
            //     try {
            //         zpRef.current.leaveRoom()
            //         zpRef.current.destroy()
            //     } catch(error){
            //         zpRef.current = null

            //     }
            // }

        }   
    }, [roomId])

    return <div ref={containerRef} className="w-full h-full" />
}

export default Video
