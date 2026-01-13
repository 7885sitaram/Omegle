import http from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import { v4 as uuid } from "uuid"
dotenv.config()

const server = http.createServer()
const io = new Server(server, { cors: { origin: "*" } })
const waiting = []
const activePair = new Map()

io.on("connection", (socket) => {
    console.log(socket.id)

    if (waiting.includes(socket.id)) return

    socket.on("start", (data) => {
        if (waiting.length > 0) {
            const partner = waiting.shift()
            const roomId = uuid()

            activePair.set(socket.id, partner)
            activePair.set(partner, socket.id)

            socket.emit("matched", { roomId })
            socket.to(partner).emit("matched", { roomId })

        } else {

            waiting.push(socket.id);
            socket.emit("waiting")

        }

        socket.on("next", () => {
            handleLeave(socket.id)
        })

        socket.on("disconnect", () => {
            handleLeave(socket.id)
        })

        function handleLeave(id) {
            // Remove from waiting list if present
            const idx = waiting.indexOf(id)
            if (idx !== -1) {
                waiting.splice(idx, 1)
                return
            }

            // Handle active pair
            const partner = activePair.get(id)
            if (partner) {
                io.to(partner).emit("partner_left")

                activePair.delete(id)
                activePair.delete(partner)
            }
        }

    })
})


// listen
const port = process.env.PORT || 5000
server.listen(port, () => {
    console.log('server run on ', port)
})