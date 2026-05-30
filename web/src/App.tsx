import {
  Accordion,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Input,
  Link,
  Separator,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react"
import { FiExternalLink } from "react-icons/fi"

const TITLE_WORD_LIMIT = 5

const sections = [
  {
    title: "Summary",
    value:
      "Route matching and request parsing have prior compatibility risk. Similar changes should preserve existing mocked endpoint behavior and include regression coverage for body formats.",
  },
  {
    title: "Historical Context",
    value:
      "Past issues mention behavior drift around route matching, request payload handling, and generated mocks. Review linked fixes before changing parser or matcher behavior.",
  },
  {
    title: "Risk Areas",
    value:
      "Content-type differences, path matching order, default body parsing behavior, and backwards compatibility for existing mock definitions.",
  },
  {
    title: "Review Checklist",
    value:
      "Add regression tests for JSON and text bodies. Verify old mocks still match. Confirm behavior across GET, POST, and dynamic route patterns.",
  },
]

const sources = [
  {
    title: "Request body parsing regression",
    kind: "issue",
    state: "closed",
    url: "https://github.com/mockoon/mockoon/issues/101",
  },
  {
    title:
      "Route matching fails when dynamic path parameters are combined with query string based mock rules",
    kind: "issue",
    state: "open",
    url: "https://github.com/mockoon/mockoon/issues/118",
  },
  {
    title: "Fix request body parsing compatibility",
    kind: "pull_request",
    state: "closed",
    url: "https://github.com/mockoon/mockoon/pull/102",
  },
  {
    title:
      "Preserve request body parser behavior while adding regression coverage for mixed content types",
    kind: "pull_request",
    state: "open",
    url: "https://github.com/mockoon/mockoon/pull/119",
  },
]

function ReportAccordion() {
  return (
    <Accordion.Root collapsible defaultValue={["Summary"]}>
      {sections.map((section) => (
        <Accordion.Item key={section.title} value={section.title}>
          <Accordion.ItemTrigger>
            <Text flex="1" fontWeight="medium">
              {section.title}
            </Text>
            <Accordion.ItemIndicator />
          </Accordion.ItemTrigger>
          <Accordion.ItemContent>
            <Accordion.ItemBody>
              <Text color="fg.muted" lineHeight="1.7">
                {section.value}
              </Text>
            </Accordion.ItemBody>
          </Accordion.ItemContent>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}

function Sources() {
  const openPullRequests = sources.filter(
    (source) => source.kind === "pull_request" && source.state === "open",
  )
  const closedPullRequests = sources.filter(
    (source) => source.kind === "pull_request" && source.state === "closed",
  )
  const openIssues = sources.filter(
    (source) => source.kind === "issue" && source.state === "open",
  )
  const closedIssues = sources.filter(
    (source) => source.kind === "issue" && source.state === "closed",
  )

  const truncateTitle = (title: string) => {
    const words = title.split(/\s+/)

    if (words.length <= TITLE_WORD_LIMIT) {
      return title
    }

    return `${words.slice(0, TITLE_WORD_LIMIT).join(" ")} [...]`
  }

  const renderSource = (source: (typeof sources)[number]) => (
    <Flex key={source.url} as="li" gap="3" align="start">
      <Box as="span" mt="2" boxSize="5px" borderRadius="full" bg="gray.500" />
      <Link
        href={source.url}
        target="_blank"
        rel="noreferrer"
        fontWeight="medium"
        color="blue.500"
        lineHeight="1.5"
        display="inline-flex"
        alignItems="center"
        gap="2"
        _hover={{ color: "blue.600", textDecoration: "underline" }}
      >
        <Text as="span">{truncateTitle(source.title)}</Text>
        <Box as="span" flexShrink={0} boxSize="16px" lineHeight="1">
          <FiExternalLink aria-hidden="true" size={16} />
        </Box>
      </Link>
    </Flex>
  )

  return (
    <Stack gap="6">
      <Box>
        <Heading size="sm" mb="3">
          Pull Requests
        </Heading>
        <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="6">
          <Stack gap="3">
            <Text fontSize="sm" color="fg.muted" fontWeight="medium">
              Open
            </Text>
            <Stack as="ul" gap="3" listStyleType="none" m="0" p="0">
              {openPullRequests.map(renderSource)}
            </Stack>
          </Stack>

          <Stack gap="3">
            <Text fontSize="sm" color="fg.muted" fontWeight="medium">
              Closed
            </Text>
            <Stack as="ul" gap="3" listStyleType="none" m="0" p="0">
              {closedPullRequests.map(renderSource)}
            </Stack>
          </Stack>
        </Grid>
      </Box>

      <Separator />

      <Box>
        <Heading size="sm" mb="3">
          Issues
        </Heading>
        <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="6">
          <Stack gap="3">
            <Text fontSize="sm" color="fg.muted" fontWeight="medium">
              Open
            </Text>
            <Stack as="ul" gap="3" listStyleType="none" m="0" p="0">
              {openIssues.map(renderSource)}
            </Stack>
          </Stack>

          <Stack gap="3">
            <Text fontSize="sm" color="fg.muted" fontWeight="medium">
              Closed
            </Text>
            <Stack as="ul" gap="3" listStyleType="none" m="0" p="0">
              {closedIssues.map(renderSource)}
            </Stack>
          </Stack>
        </Grid>
      </Box>
    </Stack>
  )
}

export default function App() {
  return (
    <Grid
      minH="100vh"
      minW="920px"
      templateColumns="minmax(320px, 32vw) minmax(560px, 1fr)"
      bg="#fbfaf7"
    >
      <Box px="10" py="8" borderRightWidth="1px" bg="white">
        <Stack gap="6">
          <Box>
            <Heading size="2xl">Devbase</Heading>
            <Stack gap="2" mt="1">
              <Text color="fg.muted">Ask before changing code.</Text>
              <Text color="fg.muted">
                Devbase pulls in GitHub data to help you plan.
              </Text>
            </Stack>
          </Box>

          <Stack gap="3">
            <Text fontSize="sm" fontWeight="medium">
              Repository
            </Text>
            <Input value="mockoon/mockoon" readOnly fontSize="md" />
          </Stack>

          <Stack gap="3">
            <Text fontSize="sm" fontWeight="medium">
              Planned change
            </Text>
            <Textarea
              minH="180px"
              fontSize="md"
              placeholder="I am changing request body parsing for mocked endpoints..."
            />
            <Button bg="black" color="white">
              Generate report
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Box p="8">
        <Stack gap="6" maxW="860px">
          <Box>
            <Heading size="2xl">Risk Review</Heading>
          </Box>

          <Box bg="white" borderWidth="1px" borderRadius="lg" p="5">
            <ReportAccordion />
          </Box>

          <Box bg="white" borderWidth="1px" borderRadius="lg" p="5">
            <Heading size="md" mb="4">
              Sources
            </Heading>
            <Sources />
          </Box>
        </Stack>
      </Box>
    </Grid>
  )
}
