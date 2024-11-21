import '@/app/globals.css'
import { Analytics } from '@vercel/analytics/react'

export const metadata = {
    title: 'English Teacher',
    description: 'Your friendly spelling and grammar helper!',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>
                {children}
                <Analytics />
            </body>
        </html>
    )
}
