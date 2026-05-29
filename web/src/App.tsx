import { useState } from "react"
import {
  Blockquote,
  Box,
  Button,
  Container,
  Heading,
  Input,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react"

type RiskResponse = {
  report: string | null
  sources: string[]
  blocked: boolean
  block_reason: string | null
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export default function App() {
  const [changeDescription, setChangeDescription] = useState("")
  const [result, setResult] = useState<RiskResponse | null>(null)
  const [loading, setLoading] = useState(false)

  async function generateReport() {
    setLoading(true)

    const response = await fetch(`${API_URL}/change-risk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repo: "mockoon/mockoon",
        change_description: changeDescription,
      }),
    })

    const data = await response.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <Container maxW="3xl" py="10">
      <Stack gap="6">
        <Box>
          <Heading size="2xl">Devbase</Heading>
          <Text color="fg.muted" mt="2">
            Generate a cited change-risk report from GitHub history.
          </Text>
        </Box>

        <Stack gap="3">
          <Input
            placeholder="Input description of what you will change in the repo..."
            value={changeDescription}
            onChange={(event) => setChangeDescription(event.target.value)}
          />

          <Button
            onClick={generateReport}
            loading={loading}
            disabled={!changeDescription.trim()}
          >
            Generate report
          </Button>
        </Stack>

        {result?.report && (
          <Box whiteSpace="pre-wrap">
            <Heading size="md" mb="3">
              Report
            </Heading>
            <Text>{result.report}</Text>
          </Box>
        )}

        {result?.sources?.length ? (
          <Stack gap="3">
            <Heading size="md">Sources</Heading>

            {result.sources.map((source) => (
              <Blockquote.Root key={source}>
                <Blockquote.Content cite={source}>
                  <Link href={source} target="_blank" rel="noreferrer">
                    {source}
                  </Link>
                </Blockquote.Content>
              </Blockquote.Root>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Container>
  )
}