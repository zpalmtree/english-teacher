'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

export default function EnglishTeacher() {
    const [userText, setUserText] = useState('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result, setResult] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setResult(null)

        if (!userText.trim()) {
            setError('Please enter some text before submitting.')
            setIsLoading(false)
            return
        }

        try {
            const response = await fetch('/api/spelling-check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: userText }),
            })
            if (!response.ok) {
                throw new Error('Network response was not ok')
            }
            const data = await response.json()
            setResult(data)
        } catch (err) {
            setError('An error occurred. Please try again.')
            console.log(err);
        } finally {
            setIsLoading(false)
        }
    }

    const renderResult = () => {
        if (!result) return null

        const { hasErrors, errors, feedback, correctedText } = result
        
        return (
            <div className="mt-6 space-y-6">
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <h3 className="text-lg font-semibold mb-2 text-green-600">
                        {hasErrors ? "Corrected Text:" : "Your Text (No Corrections Needed):"}
                    </h3>
                    <p className="text-lg leading-relaxed whitespace-pre-wrap">{correctedText}</p>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <h3 className="text-lg font-semibold mb-3 text-blue-600">Feedback:</h3>
                    <div className="space-y-4">
                        {feedback && (
                            <div className="flex gap-3 items-start pb-2">
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <p className="text-gray-600">{feedback}</p>
                            </div>
                        )}
                        {hasErrors && errors.length > 0 && (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {errors.map((err: { original: string; correction: string; explanation: string }, index: number) => (
                                    <div key={index} className="bg-gray-50 p-3 rounded-md">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="font-medium">
                                                    <span className="line-through text-red-500">{err.original}</span>
                                                    {' → '}
                                                    <span className="text-green-600">{err.correction}</span>
                                                </p>
                                                <p className="text-sm text-gray-600 mt-1">{err.explanation}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-100 to-green-100 py-8 px-4">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center text-blue-600">English Teacher</CardTitle>
                    <CardDescription className="text-center text-lg">
                        {`Your friendly writing helper! Type your text below and I'll help you improve it.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Textarea
                            placeholder="Type your text here..."
                            value={userText}
                            onChange={(e) => setUserText(e.target.value)}
                            className="min-h-[150px] p-4 text-lg border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-400"
                        />
                        <Button 
                            type="submit" 
                            disabled={isLoading || !userText.trim()} 
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Checking your writing...' : 'Check My Writing!'}
                        </Button>
                    </form>
                    {isLoading && (
                        <div className="mt-4 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                            <p className="mt-2 text-green-600">Reading your text...</p>
                        </div>
                    )}
                    {error && (
                        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg flex items-start gap-2">
                            <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}
                    {renderResult()}
                </CardContent>
            </Card>
        </div>
    )
}
