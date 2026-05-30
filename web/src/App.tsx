import {
  Badge,
  Box,
  Button,
  CloseButton,
  Code,
  Drawer,
  Flex,
  Grid,
  Heading,
  Input,
  Link,
  Portal,
  SegmentGroup,
  Separator,
  Slider,
  Stack,
  Spinner,
  Text,
  Textarea,
  Timeline,
  Tooltip as ChakraTooltip,
} from "@chakra-ui/react"
import { type ReactNode, useState } from "react"
import { FiExternalLink } from "react-icons/fi"
import {
  HiInformationCircle,
  HiCheck,
  HiLockClosed,
  HiOutlineAdjustments,
  HiOutlineClock,
  HiOutlineCubeTransparent,
  HiOutlineScale,
  HiOutlineShare,
  HiOutlineTerminal,
} from "react-icons/hi"

const TITLE_WORD_LIMIT = 5
type PreviewState = "idle" | "loading" | "report"

const fetchLimitMarks = [
  { value: 0, label: "0" },
  { value: 10, label: "10" },
  { value: 20, label: "20" },
]

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="18"
      height="18"
      fill="currentColor"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
    </svg>
  )
}

function Tooltip({
  children,
  content,
}: {
  children: ReactNode
  content: ReactNode
}) {
  return (
    <ChakraTooltip.Root positioning={{ placement: "right" }}>
      <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
      <Portal>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content>{content}</ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </Portal>
    </ChakraTooltip.Root>
  )
}

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
    state: "open",
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

function ReportSegments() {
  const [selectedSection, setSelectedSection] = useState(sections[0].title)
  const activeSection =
    sections.find((section) => section.title === selectedSection) ?? sections[0]

  return (
    <Stack gap="0">
      <SegmentGroup.Root
        value={selectedSection}
        onValueChange={(details) => setSelectedSection(details.value ?? sections[0].title)}
        width="fit-content"
        bg="gray.100"
        borderWidth="1px"
        borderRadius="0"
        p="1"
        css={{
          "--segment-indicator-bg": "white",
          "--segment-indicator-shadow": "var(--chakra-shadows-sm)",
          "--segment-indicator-radius": "0",
        }}
      >
        <SegmentGroup.Indicator />
        {sections.map((section) => (
          <SegmentGroup.Item
            key={section.title}
            value={section.title}
            px="4"
            minH="9"
          >
            <SegmentGroup.ItemText>{section.title}</SegmentGroup.ItemText>
            <SegmentGroup.ItemHiddenInput />
          </SegmentGroup.Item>
        ))}
      </SegmentGroup.Root>

      <Box
        bg="white"
        borderWidth="1px"
        borderTopRadius="0"
        borderBottomRadius="lg"
        p="5"
        mt="-1px"
      >
        <Heading size="md" mb="3">
          {activeSection.title}
        </Heading>
        <Text color="fg.muted" lineHeight="1.7">
          {activeSection.value}
        </Text>
      </Box>
    </Stack>
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

  const renderStatusBadge = (status: "Open" | "Closed", count: number) => (
    <Badge
      colorPalette={status === "Open" ? "green" : "gray"}
      variant="subtle"
      width="fit-content"
      display="inline-flex"
      alignItems="center"
      gap="1"
    >
      {status === "Closed" && (
        <HiLockClosed aria-hidden="true" />
      )}
      {status}{" "}
      <Text as="span" fontSize="xs" color="gray.700" fontWeight="normal">
        ({count})
      </Text>
    </Badge>
  )

  const truncateTitle = (title: string) => {
    const words = title.split(/\s+/)

    if (words.length <= TITLE_WORD_LIMIT) {
      return title
    }

    return `${words.slice(0, TITLE_WORD_LIMIT).join(" ")} ...`
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
      <Box bg="white" borderWidth="1px" borderRadius="lg" p="5">
        <Flex align="center" gap="2" mb="6">
          <GitHubIcon />
          <Heading size="md">Pull Requests</Heading>
        </Flex>
        <Grid templateColumns="minmax(0, 1fr) auto minmax(0, 1fr)" gap="6">
          <Stack gap="3">
            {renderStatusBadge("Open", openPullRequests.length)}
            <Stack as="ul" gap="3" listStyleType="none" m="0" p="0">
              {openPullRequests.map(renderSource)}
            </Stack>
          </Stack>

          <Separator orientation="vertical" />

          <Stack gap="3">
            {renderStatusBadge("Closed", closedPullRequests.length)}
            <Stack as="ul" gap="3" listStyleType="none" m="0" p="0">
              {closedPullRequests.map(renderSource)}
            </Stack>
          </Stack>
        </Grid>
      </Box>

      <Box bg="white" borderWidth="1px" borderRadius="lg" p="5">
        <Flex align="center" gap="2" mb="6">
          <GitHubIcon />
          <Heading size="md">Issues</Heading>
        </Flex>
        <Grid templateColumns="minmax(0, 1fr) auto minmax(0, 1fr)" gap="6">
          <Stack gap="3">
            {renderStatusBadge("Open", openIssues.length)}
            <Stack as="ul" gap="3" listStyleType="none" m="0" p="0">
              {openIssues.map(renderSource)}
            </Stack>
          </Stack>

          <Separator orientation="vertical" />

          <Stack gap="3">
            {renderStatusBadge("Closed", closedIssues.length)}
            <Stack as="ul" gap="3" listStyleType="none" m="0" p="0">
              {closedIssues.map(renderSource)}
            </Stack>
          </Stack>
        </Grid>
      </Box>
    </Stack>
  )
}

function FetchLimitSlider({
  label,
  value,
  onValueChange,
}: {
  label: string
  value: number
  onValueChange: (value: number) => void
}) {
  return (
    <Slider.Root
      width="full"
      size="sm"
      min={0}
      max={20}
      step={1}
      value={[value]}
      onValueChange={(details) => onValueChange(details.value[0] ?? 0)}
    >
      <Flex align="center" mb="3">
        <Slider.Label>
          {label}: {value}
        </Slider.Label>
      </Flex>
      <Slider.Control>
        <Slider.Track>
          <Slider.Range />
        </Slider.Track>
        <Slider.Thumbs rounded="l1" />
        <Slider.Marks marks={fetchLimitMarks} />
      </Slider.Control>
    </Slider.Root>
  )
}

function RagUpdateTimeline({
  prFetchLimit,
  issueFetchLimit,
}: {
  prFetchLimit: number
  issueFetchLimit: number
}) {
  return (
    <Stack gap="4">
      <Timeline.Root>
        <Timeline.Item>
          <Timeline.Connector>
            <Timeline.Separator width="2px" bg="black" />
            <Timeline.Indicator
              bg="black"
              color="white"
              boxSize="5"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <HiCheck aria-hidden="true" size={14} />
            </Timeline.Indicator>
          </Timeline.Connector>
          <Timeline.Content>
            <Timeline.Title>Fetch</Timeline.Title>
            <Timeline.Description>
              Fetched {prFetchLimit} PRs and {issueFetchLimit} issues from GitHub.
            </Timeline.Description>
          </Timeline.Content>
        </Timeline.Item>

        <Timeline.Item>
          <Timeline.Connector>
            <Timeline.Separator width="2px" bg="gray.300" />
            <Timeline.Indicator
              bg="black"
              color="white"
              boxSize="5"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <HiCheck aria-hidden="true" size={14} />
            </Timeline.Indicator>
          </Timeline.Connector>
          <Timeline.Content>
            <Timeline.Title>Run eval</Timeline.Title>
            <Timeline.Description>
              <Badge colorPalette="green" variant="subtle">
                Passed
              </Badge>
            </Timeline.Description>
          </Timeline.Content>
        </Timeline.Item>

        <Timeline.Item>
          <Timeline.Connector>
            <Timeline.Separator width="2px" bg="gray.300" />
            <Timeline.Indicator
              color="gray.500"
              bg="transparent"
              boxSize="5"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <HiOutlineClock aria-hidden="true" size={22} />
            </Timeline.Indicator>
          </Timeline.Connector>
          <Timeline.Content>
            <Timeline.Title>Promote to live</Timeline.Title>
            <Timeline.Description>
              <Badge colorPalette="gray" variant="subtle">
                Not promoted
              </Badge>
            </Timeline.Description>
          </Timeline.Content>
        </Timeline.Item>
      </Timeline.Root>

      <Text color="fg.muted">Staging promoted to live.</Text>
    </Stack>
  )
}

export default function App() {
  const [previewState, setPreviewState] = useState<PreviewState>("idle")
  const [isRagUpdateOpen, setIsRagUpdateOpen] = useState(false)
  const [prFetchLimit, setPrFetchLimit] = useState(10)
  const [issueFetchLimit, setIssueFetchLimit] = useState(10)
  const [repo, setRepo] = useState("mockoon/mockoon")
  const [plannedChange, setPlannedChange] = useState("")
  const hasRequiredInput = repo.trim().length > 0 && plannedChange.trim().length > 0

  const handleGenerateReport = async () => {
    if (!hasRequiredInput || previewState === "loading") {
      return
    }

    setPreviewState("loading")
    await new Promise((resolve) => window.setTimeout(resolve, 800))
    setPreviewState("report")
  }

  const handleInputChange = (nextValue: string, updateValue: (value: string) => void) => {
    updateValue(nextValue)

    if (previewState === "report") {
      setPreviewState("idle")
    }
  }

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
            <Flex align="center" gap="2" mb="3">
              <HiOutlineCubeTransparent aria-hidden="true" size={30} />
              <Heading size="2xl">Devbase</Heading>
            </Flex>
            <Stack gap="2" mt="1">
              <Text color="fg.muted">Changing code? Describe the change and review potential risks. </Text>

            </Stack>
          </Box>

          <Separator />

          <Stack gap="3" mb="3">
            <Flex align="center" gap="2">
              <Heading size="md">Repository</Heading>
              <Tooltip
                content={
                  <Stack gap="1">
                    <Text>Public GitHub repo, or private repo</Text>
                    <Text>(configure token in source code).</Text>
                  </Stack>
                }
              >
                <Box as="span" color="gray.400">
                  <HiInformationCircle aria-label="Repository input help" size={18} />
                </Box>
              </Tooltip>
            </Flex>
            <Input
              value={repo}
              onChange={(event) => handleInputChange(event.target.value, setRepo)}
              fontSize="md"
            />
          </Stack>

          <Stack gap="3">
            <Heading size="md">
              Planned change
            </Heading>
            <Textarea
              value={plannedChange}
              onChange={(event) =>
                handleInputChange(event.target.value, setPlannedChange)
              }
              minH="125px"
              resize="none"
              fontSize="md"
              placeholder="I am changing request body parsing for mocked endpoints..."
            />
            <Button
              bg="black"
              color="white"
              disabled={!hasRequiredInput || previewState === "loading"}
              onClick={handleGenerateReport}
            >
              {previewState === "loading" ? "Generating report" : "Generate report"}
            </Button>
          </Stack>

          <Separator />

          <Stack gap="5" pt="2">
            <Stack gap="2" mb="3">
              <Flex align="center" gap="2">
                <HiOutlineScale aria-hidden="true" size={20} />
                <Heading size="md">Monitor Eval</Heading>
                <Tooltip content="Track quality over time as prompts or models change.">
                  <Box as="span" color="gray.400">
                    <HiInformationCircle aria-label="Monitor eval help" size={18} />
                  </Box>
                </Tooltip>
              </Flex>
              <Flex align="center" gap="2" color="fg.muted">
                <HiOutlineTerminal aria-hidden="true" size={18} color="fg.muted" opacity={0.62} />
                <Text fontSize="sm">
                  <Code> Add Braintrust API key in source code. </Code>
                </Text>
              </Flex>
            </Stack>

            <Stack gap="2" mt="2">
              <Flex align="center" gap="2">
                <HiOutlineAdjustments aria-hidden="true" size={20} />
                <Heading size="md">Update RAG</Heading>
                <Tooltip content="Update index by promoting new data to live storage.">
                  <Box as="span" color="gray.400">
                    <HiInformationCircle aria-label="Update RAG help" size={18} />
                  </Box>
                </Tooltip>
              </Flex>
              <Button
                variant="outline"
                width="fit-content"
                justifyContent="flex-start"
                onClick={() => setIsRagUpdateOpen(true)}
              >
                Load fresh data
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Box>

      <Drawer.Root
        open={isRagUpdateOpen}
        onOpenChange={(details) => setIsRagUpdateOpen(details.open)}
        placement="end"
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner padding="6">
            <Drawer.Content borderRadius="lg">
              <Drawer.Header>
                <Drawer.Title>Update RAG</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                <Stack gap="8">
                  <Text color="fg.muted">
                    Run the n8n quality gate to evaluate staged RAG data before promoting it to live.
                  </Text>

                  <Stack gap="8">
                    <FetchLimitSlider
                      label="Pull requests"
                      value={prFetchLimit}
                      onValueChange={setPrFetchLimit}
                    />
                    <FetchLimitSlider
                      label="Issues"
                      value={issueFetchLimit}
                      onValueChange={setIssueFetchLimit}
                    />
                  </Stack>

                  <RagUpdateTimeline
                    prFetchLimit={prFetchLimit}
                    issueFetchLimit={issueFetchLimit}
                  />
                </Stack>
              </Drawer.Body>
              <Drawer.Footer>
                <Button variant="outline" onClick={() => setIsRagUpdateOpen(false)}>
                  Close
                </Button>
              </Drawer.Footer>
              <Drawer.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>

      <Box p="8">
        <Stack
          gap="6"
          width="full"
          maxW={previewState === "report" ? "860px" : "none"}
        >
          {previewState === "report" && (
            <Box>
              <Heading size="2xl">Risk Review</Heading>
            </Box>
          )}

          {previewState === "idle" && (
            <Flex
              minH="calc(100vh - 64px)"
              width="full"
              align="center"
              justify="center"
              textAlign="center"
              color="fg.muted"
              opacity={0.62}
            >
              <Stack align="center" gap="4" maxW="360px" transform="translateY(-48px)">
                <HiOutlineShare aria-hidden="true" size={168} />
                <Text fontSize="2xl" lineHeight="1.45">
                  Enter a repo and planned change on the left to generate review.
                </Text>
              </Stack>
            </Flex>
          )}

          {previewState === "loading" && (
            <Flex
              minH="calc(100vh - 64px)"
              width="full"
              align="center"
              justify="center"
              textAlign="center"
              color="fg.muted"
              opacity={0.65}
            >
              <Stack align="center" gap="4" transform="translateY(-48px)">
                <Spinner width="112px" height="112px" borderWidth="6px" />
                <Text fontSize="2xl" lineHeight="1.45">
                  Generating report
                </Text>
              </Stack>
            </Flex>
          )}

          {previewState === "report" && (
            <>
              <ReportSegments />
              <Sources />
            </>
          )}
        </Stack>
      </Box>
    </Grid>
  )
}
