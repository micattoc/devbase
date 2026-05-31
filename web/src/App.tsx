import {
  Alert,
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
  InputGroup,
  Link,
  Portal,
  SegmentGroup,
  Separator,
  Slider,
  Stack,
  Highlight,
  Spinner,
  Text,
  Textarea,
  Timeline,
  Tooltip as ChakraTooltip,
} from "@chakra-ui/react"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { FiExternalLink } from "react-icons/fi"
import {
  HiInformationCircle,
  HiCheck,
  HiLockClosed,
  HiOutlineAdjustments,
  HiOutlineClock,
  HiOutlineCubeTransparent,
  HiOutlineCog,
  HiOutlineDocumentSearch,
  HiOutlineDocumentText,
  HiOutlineFolder,
  HiOutlineFolderDownload,
  HiAtSymbol,
  HiOutlineScale,
  HiOutlineShare,
  HiOutlineTerminal,
} from "react-icons/hi"

const TITLE_WORD_LIMIT = 5
type PreviewState = "idle" | "loading" | "report"
type N8nSetupState = "missing" | "ready"
type RagUpdateStage = "idle" | "fetching" | "evaluating" | "complete"
type ReportSection = {
  title: string
  value: string
}
type ReportSource = {
  title: string
  kind: "issue" | "pull_request"
  state: "open" | "closed"
  url: string
  updated_at?: string | null
}
type N8nSetupResponse = {
  imported: boolean
}
type RiskResponse = {
  report: string | null
  sources: string[]
  source_details?: ReportSource[]
  blocked: boolean
  block_reason: string | null
}
type QualityGateTriggerResponse = {
  triggered: boolean
  webhook_url: string
  status: string
  message: string
}
type GitHubIngestResponse = {
  repo: string
  pr_limit: number
  issue_limit: number
  fetched: number
  inserted: number
  skipped: number
  inserted_prs: number
  inserted_issues: number
}
type RagStorageStatusResponse = {
  exists: boolean
  display_date: string | null
  days_ago: number | null
}
type GoldenSetStatusResponse = {
  established: boolean
  case_count: number
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

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
  placement = "right",
  showArrow = false,
}: {
  children: ReactNode
  content: ReactNode
  placement?: "right" | "bottom"
  showArrow?: boolean
}) {
  return (
    <ChakraTooltip.Root positioning={{ placement }}>
      <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
      <Portal>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content>
            {showArrow && (
              <ChakraTooltip.Arrow>
                <ChakraTooltip.ArrowTip />
              </ChakraTooltip.Arrow>
            )}
            {content}
          </ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </Portal>
    </ChakraTooltip.Root>
  )
}

const defaultSections: ReportSection[] = [
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

const defaultSources: ReportSource[] = [
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

const sectionTitles = ["Summary", "Historical Context", "Risk Areas", "Review Checklist"]
const validSourceUrlPattern = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(?:issues|pull)\/\d+/

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function unwrapCitationLinks(value: string) {
  return value
    .replace(
      /\[\s*((?:Pull Request|PR|Issue)\s+)#?(\d+)\s*\]\s*\([^)]*\)/gi,
      "$1#$2",
    )
    .replace(/\[\s*#?(\d+)\s*\]\s*\([^)]*\)/g, "#$1")
    .replace(/\[\s*((?:Pull Request|PR|Issue)\s+)#?(\d+)\s*\]/gi, "$1#$2")
    .replace(/\[\s*#?(\d+)\s*\]/g, "#$1")
}

function cleanReportText(value: string) {
  return unwrapCitationLinks(value)
    .replace(/^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:Sources?|References?)(?:\*\*)?\s*:?\s*[\s\S]*$/im, "")
    .replace(/^.*\b(?:README|Code of Conduct|Contributing Guidelines?|CONTRIBUTING\.md)\b.*$/gim, "")
    .replace(/\b((?:Pull Request|PR|Issue)\s+)#?(\d+)\s*\([^)]*\)/gi, "$1#$2")
    .replace(/\b((?:Pull Request|PR|Issue)\s+)#?(\d+)\b/gi, "$1#$2")
    .replace(/\[?\b(?:PR_REVIEW_COMMENT|ISSUE_COMMENT|PULL_REQUEST|ISSUE)\s+\d+\]?:?/gi, "")
    .replace(/https:\/\/github\.com\/[^\s)\]]+/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\*\*/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s*(?=(Summary|Historical Context|Risk Areas|Review Checklist)\b)/gim, "")
    .replace(/\s+-\s+/g, "\n- ")
    .replace(/\n(- .+?)(?=\n- |\n\n|$)/g, "\n$1\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/.*/s, (text) => unwrapCitationLinks(text))
    .trim()
}

function sectionHeaderPattern(title: string) {
  return new RegExp(
    `^\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?${escapeRegExp(title)}(?:\\*\\*)?\\s*:?.*$`,
    "im",
  )
}

function parseReportSections(report: string | null): ReportSection[] {
  if (!report?.trim()) {
    return defaultSections
  }

  const sectionMatches = sectionTitles
    .map((title) => {
      const match = sectionHeaderPattern(title).exec(report)

      return match
        ? {
            title,
            start: match.index,
            end: match.index + match[0].length,
          }
        : null
    })
    .filter((match): match is { title: string; start: number; end: number } => match !== null)
    .sort((a, b) => a.start - b.start)

  const sectionValues = new Map<string, string>()

  sectionMatches.forEach((match, index) => {
    const nextMatch = sectionMatches[index + 1]
    const rawValue = report.slice(match.end, nextMatch?.start ?? report.length)
    sectionValues.set(match.title, cleanReportText(rawValue))
  })

  const parsedSections = sectionTitles.map((title) => ({
    title,
    value: sectionValues.get(title) ?? "",
  }))

  if (parsedSections.some((section) => section.value.length > 0)) {
    return parsedSections.map((section) => ({
      title: section.title,
      value: section.value || "No details returned for this section.",
    }))
  }

  return [
    { title: "Summary", value: cleanReportText(report) },
    { title: "Historical Context", value: "No separate historical context returned." },
    { title: "Risk Areas", value: "No separate risk areas returned." },
    { title: "Review Checklist", value: "No separate review checklist returned." },
  ]
}

function sourceFromUrl(url: string): ReportSource {
  const isPullRequest = url.includes("/pull/")
  const number = url.match(/\/(?:issues|pull)\/(\d+)/)?.[1]

  return {
    title: isPullRequest
      ? `Referenced pull request${number ? ` #${number}` : ""}`
      : `Referenced issue${number ? ` #${number}` : ""}`,
    kind: isPullRequest ? "pull_request" : "issue",
    state: "open",
    url,
  }
}

function sourceFromDetail(source: ReportSource): ReportSource {
  if (source.title.trim().length === 0) {
    return {
      ...sourceFromUrl(source.url),
      state: source.state,
    }
  }

  return source
}

function ReportText({ value }: { value: string }) {
  const lines = value.split("\n").filter((line) => line.trim().length > 0)

  return (
    <Stack gap="3">
      {lines.map((line, index) => {
        const trimmedLine = line.trim()
        const isBullet = trimmedLine.startsWith("- ")
        const text = isBullet ? trimmedLine.slice(2) : trimmedLine
        const colonIndex = isBullet ? text.indexOf(":") : -1
        const hasBulletLead = colonIndex > 0

        return (
          <Flex key={`${line}-${index}`} align="start" gap="3">
            {isBullet && (
              <Box
                as="span"
                mt="3"
                boxSize="6px"
                borderRadius="full"
                bg="fg.muted"
                flexShrink={0}
              />
            )}
            <Text color="fg.muted" lineHeight="1.7">
              {hasBulletLead ? (
                <>
                  <Text as="span" fontWeight="semibold" color="fg">
                    {text.slice(0, colonIndex + 1)}
                  </Text>{" "}
                  {text.slice(colonIndex + 1).trimStart()}
                </>
              ) : (
                text
              )}
            </Text>
          </Flex>
        )
      })}
    </Stack>
  )
}

function ReportSegments({ sections }: { sections: ReportSection[] }) {
  const [selectedSection, setSelectedSection] = useState(sections[0].title)
  const activeSection =
    sections.find((section) => section.title === selectedSection) ?? sections[0]

  useEffect(() => {
    setSelectedSection(sections[0].title)
  }, [sections])

  return (
    <Stack gap="0">
      <SegmentGroup.Root
        value={selectedSection}
        onValueChange={(details) => setSelectedSection(details.value ?? sections[0].title)}
        width="fit-content"
        bg="bg.emphasized"
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
            <SegmentGroup.ItemText fontSize="md">{section.title}</SegmentGroup.ItemText>
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
        
        <ReportText value={activeSection.value} />
      </Box>
    </Stack>
  )
}

function Sources({ sources }: { sources: ReportSource[] }) {
  const pullRequestSources = sources.filter((source) => source.kind === "pull_request")
  const issueSources = sources.filter((source) => source.kind === "issue")
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
        <Text as="span">
          {(() => {
            const number = source.url.match(/\/(?:issues|pull)\/(\d+)/)?.[1]
            return `${number ? `#${number} ` : ""}${truncateTitle(source.title)}`
          })()}
        </Text>
        <Box as="span" flexShrink={0} boxSize="16px" lineHeight="1">
          <FiExternalLink aria-hidden="true" size={16} />
        </Box>
      </Link>
    </Flex>
  )

  return (
    <Stack gap="6">
      {pullRequestSources.length > 0 && (
        <Box bg="white" borderWidth="1px" borderRadius="lg" borderColor="blue.subtle" p="5">
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
      )}

      {issueSources.length > 0 && (
        <Box bg="white" borderWidth="1px" borderRadius="lg" borderColor="blue.subtle" p="5">
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
      )}
    </Stack>
  )
}

function FetchLimitSlider({
  label,
  value,
  disabled = false,
  onValueChange,
}: {
  label: string
  value: number
  disabled?: boolean
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
      disabled={disabled}
      onValueChange={(details) => onValueChange(details.value[0] ?? 0)}
    >
      <Flex align="center" mb="3">
        <Slider.Label display="inline-flex" alignItems="center" gap="1">
          <Heading as="span" size="md">
            {label}:
          </Heading>
          <Text as="span" fontSize="md" fontWeight="semibold" lineHeight="1.2">
            {value}
          </Text>
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
  stage,
  result,
  ingestResult,
}: {
  prFetchLimit: number
  issueFetchLimit: number
  stage: RagUpdateStage
  result: QualityGateTriggerResponse | null
  ingestResult: GitHubIngestResponse | null
}) {
  const isFetchComplete = stage === "evaluating" || stage === "complete"
  const isEvalComplete = stage === "complete"
  const gatePassed = result?.status?.toLowerCase() === "passed"
  const insertedPrs = ingestResult?.inserted_prs ?? 0
  const insertedIssues = ingestResult?.inserted_issues ?? 0
  const hasNewGitHubData = insertedPrs + insertedIssues > 0
  const fetchCompleteText = (() => {
    if (!hasNewGitHubData) {
      return "Data already integrated"
    }

    if (insertedPrs > 0 && insertedIssues > 0) {
      return `${insertedPrs} new PRs and ${insertedIssues} issues`
    }

    if (insertedPrs > 0) {
      return `${insertedPrs} new PRs`
    }

    return `${insertedIssues} new issues`
  })()

  const renderCompletedIndicator = () => (
    <Timeline.Indicator
      bg="black"
      color="white"
      boxSize="6"
      borderRadius="full"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <HiCheck aria-hidden="true" size={18} />
    </Timeline.Indicator>
  )

  const renderPendingIndicator = () => (
    <Timeline.Indicator
      color="gray.500"
      bg="transparent"
      boxSize="6"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <HiOutlineClock aria-hidden="true" size={28} />
    </Timeline.Indicator>
  )

  return (
    <Stack gap="5" p="5">
      <Timeline.Root>
        <Timeline.Item>
          <Timeline.Connector>
            <Timeline.Separator width="2px" bg={isFetchComplete ? "black" : "gray.300"} />
            {isFetchComplete ? renderCompletedIndicator() : renderPendingIndicator()}
          </Timeline.Connector>
          <Timeline.Content>
            <Timeline.Title fontSize="md">Fetch</Timeline.Title>
            <Timeline.Description>
              <Flex align="center" gap="1" fontSize="sm">
                {isFetchComplete ? (
                  <HiOutlineFolder aria-hidden="true" size={17} />
                ) : (
                  <HiOutlineFolderDownload aria-hidden="true" size={17} />
                )}
                <Text as="span" fontSize="m">
                  {isFetchComplete
                    ? ingestResult
                      ? fetchCompleteText
                      : `${prFetchLimit} PRs and ${issueFetchLimit} issues`
                    : "Fetching from GitHub..."}
                </Text>
              </Flex>
            </Timeline.Description>
          </Timeline.Content>
        </Timeline.Item>

        {hasNewGitHubData && (stage === "evaluating" || stage === "complete") && (
          <Timeline.Item>
            <Timeline.Connector>
              <Timeline.Separator width="2px" bg={isEvalComplete ? "black" : "gray.300"} />
              {isEvalComplete ? renderCompletedIndicator() : renderPendingIndicator()}
            </Timeline.Connector>
            <Timeline.Content>
              <Timeline.Title fontSize="md">Run eval</Timeline.Title>
              <Timeline.Description>
                {isEvalComplete ? (
                  <Badge colorPalette={gatePassed ? "green" : "red"} variant="subtle">
                    <Text fontSize="m">{gatePassed ? "Passed" : "Failed"}</Text>
                  </Badge>
                ) : (
                  <Flex align="center" gap="1" fontSize="sm">
                    <HiOutlineDocumentSearch aria-hidden="true" size={17} />
                    <Text as="span" fontSize="m">
                      Quality checking...
                    </Text>
                  </Flex>
                )}
              </Timeline.Description>
            </Timeline.Content>
          </Timeline.Item>
        )}

        {hasNewGitHubData && stage === "complete" && (
          <Timeline.Item>
            <Timeline.Connector>
              <Timeline.Separator width="2px" bg="gray.300" />
              {renderCompletedIndicator()}
            </Timeline.Connector>
            <Timeline.Content>
              <Timeline.Title fontSize="md">Integrate RAG</Timeline.Title>
              <Timeline.Description>
                <Badge colorPalette={gatePassed ? "green" : "red"} variant="subtle">
                  {gatePassed ? "Data integrated" : "Failed to integrate"}
                </Badge>
              </Timeline.Description>
            </Timeline.Content>
          </Timeline.Item>
        )}
      </Timeline.Root>

      {hasNewGitHubData && stage === "complete" && (
        <Text color="fg.muted" fontSize="sm">
          {result?.message || "Quality gate completed."}
        </Text>
      )}
    </Stack>
  )
}

export default function App() {
  const [previewState, setPreviewState] = useState<PreviewState>("idle")
  const [isRagUpdateOpen, setIsRagUpdateOpen] = useState(false)
  const [hasStartedRagUpdate, setHasStartedRagUpdate] = useState(false)
  const [ragUpdateStage, setRagUpdateStage] = useState<RagUpdateStage>("idle")
  const [qualityGateResult, setQualityGateResult] =
    useState<QualityGateTriggerResponse | null>(null)
  const [githubIngestResult, setGithubIngestResult] =
    useState<GitHubIngestResponse | null>(null)
  const [n8nSetupState, setN8nSetupState] = useState<N8nSetupState>("missing")
  const [ragStorageStatus, setRagStorageStatus] =
    useState<RagStorageStatusResponse | null>(null)
  const [goldenSetStatus, setGoldenSetStatus] =
    useState<GoldenSetStatusResponse | null>(null)
  const [prFetchLimit, setPrFetchLimit] = useState(10)
  const [issueFetchLimit, setIssueFetchLimit] = useState(10)
  const [repo, setRepo] = useState("")
  const [plannedChange, setPlannedChange] = useState("")
  const [reportSections, setReportSections] = useState<ReportSection[]>(defaultSections)
  const [reportSources, setReportSources] = useState<ReportSource[]>(defaultSources)
  const ragUpdateTimers = useRef<number[]>([])
  const hasRequiredInput = repo.trim().length > 0 && plannedChange.trim().length > 0
  const isRagUpdateConfigured =
    goldenSetStatus?.established === true && n8nSetupState === "ready"

  useEffect(() => {
    const loadN8nSetupStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/n8n-setup`)

        if (!response.ok) {
          setN8nSetupState("missing")
          return
        }

        const payload = (await response.json()) as N8nSetupResponse
        setN8nSetupState(payload.imported ? "ready" : "missing")
      } catch {
        setN8nSetupState("missing")
      }
    }

    void loadN8nSetupStatus()
  }, [])

  useEffect(() => {
    const loadRagStorageStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/rag-storage-status`)

        if (!response.ok) {
          setRagStorageStatus(null)
          return
        }

        setRagStorageStatus((await response.json()) as RagStorageStatusResponse)
      } catch {
        setRagStorageStatus(null)
      }
    }

    void loadRagStorageStatus()
  }, [])

  useEffect(() => {
    const loadGoldenSetStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/golden-set-status`)

        if (!response.ok) {
          setGoldenSetStatus(null)
          return
        }

        setGoldenSetStatus((await response.json()) as GoldenSetStatusResponse)
      } catch {
        setGoldenSetStatus(null)
      }
    }

    void loadGoldenSetStatus()
  }, [])

  useEffect(() => {
    return () => {
      ragUpdateTimers.current.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  const ragUpdatedSuffix =
    ragStorageStatus?.days_ago === 0
      ? "today"
      : `${ragStorageStatus?.days_ago ?? 0} days ago`
  const lastUpdatedText =
    ragStorageStatus?.exists && ragStorageStatus.display_date !== null
      ? `Last updated: ${ragStorageStatus.display_date} (${ragUpdatedSuffix})`
      : "Last updated: Not available"
  const ragLastUpdatedText =
    ragStorageStatus?.exists && ragStorageStatus.display_date !== null
      ? `RAG last updated: ${ragStorageStatus.display_date} (${ragUpdatedSuffix})`
      : "RAG last updated: Not available"

  const handleGenerateReport = async () => {
    if (!hasRequiredInput || previewState === "loading") {
      return
    }

    setPreviewState("loading")

    try {
      const response = await fetch(`${API_BASE_URL}/change-risk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo: repo.trim(),
          change_description: plannedChange.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Risk report request failed with HTTP ${response.status}`)
      }

      const payload = (await response.json()) as RiskResponse
      const reportText = payload.blocked
        ? payload.block_reason || "The report was blocked."
        : payload.report

      setReportSections(parseReportSections(reportText))
      const sourceDetails =
        payload.source_details && payload.source_details.length > 0
          ? payload.source_details
          : payload.sources.map(sourceFromUrl)

      setReportSources(
        sourceDetails
          .filter((source) => validSourceUrlPattern.test(source.url))
          .map(sourceFromDetail),
      )
      setPreviewState("report")
    } catch (error) {
      setReportSections([
        {
          title: "Summary",
          value:
            error instanceof Error
              ? error.message
              : "Unable to generate the risk report.",
        },
        { title: "Historical Context", value: "No report returned." },
        { title: "Risk Areas", value: "No report returned." },
        { title: "Review Checklist", value: "No report returned." },
      ])
      setReportSources([])
      setPreviewState("report")
    }
  }

  const handleInputChange = (nextValue: string, updateValue: (value: string) => void) => {
    updateValue(nextValue)

    if (previewState === "report") {
      setPreviewState("idle")
      setReportSections(defaultSections)
      setReportSources(defaultSources)
    }
  }

  const handleStartRagUpdate = async () => {
    ragUpdateTimers.current.forEach((timer) => window.clearTimeout(timer))
    ragUpdateTimers.current = []

    setHasStartedRagUpdate(true)
    setRagUpdateStage("fetching")
    setQualityGateResult(null)
    setGithubIngestResult(null)

    try {
      const ingestResponse = await fetch(`${API_BASE_URL}/ingest-github`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo: repo.trim(),
          pr_limit: prFetchLimit,
          issue_limit: issueFetchLimit,
        }),
      })

      if (!ingestResponse.ok) {
        throw new Error(`GitHub ingestion failed with HTTP ${ingestResponse.status}`)
      }

      const ingestPayload = (await ingestResponse.json()) as GitHubIngestResponse
      setGithubIngestResult(ingestPayload)

      if (ingestPayload.inserted_prs + ingestPayload.inserted_issues === 0) {
        setRagUpdateStage("complete")
        return
      }
    } catch (error) {
      setQualityGateResult({
        triggered: false,
        webhook_url: "",
        status: "failed",
        message:
          error instanceof Error
            ? error.message
            : "GitHub ingestion failed.",
      })
      setRagUpdateStage("complete")
      return
    }

    setRagUpdateStage("evaluating")

    const triggerRequest = fetch(`${API_BASE_URL}/trigger-quality-gate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    try {
      const response = await triggerRequest

      if (!response.ok) {
        throw new Error(`Quality gate request failed with HTTP ${response.status}`)
      }

      const payload = (await response.json()) as QualityGateTriggerResponse
      setQualityGateResult(payload)
    } catch (error) {
      setQualityGateResult({
        triggered: false,
        webhook_url: "",
        status: "failed",
        message:
          error instanceof Error
            ? error.message
            : "Quality gate request failed.",
      })
    }

    setRagUpdateStage("complete")

    try {
      const response = await fetch(`${API_BASE_URL}/rag-storage-status`)

      if (response.ok) {
        setRagStorageStatus((await response.json()) as RagStorageStatusResponse)
      }
    } catch {
      // Keep the previous freshness value if the refresh endpoint is unavailable.
    }
  }

  const openRagUpdateDrawer = async () => {
    ragUpdateTimers.current.forEach((timer) => window.clearTimeout(timer))
    ragUpdateTimers.current = []

    setHasStartedRagUpdate(false)
    setRagUpdateStage("idle")
    setQualityGateResult(null)
    setGithubIngestResult(null)

    try {
      const [n8nResponse, goldenSetResponse, ragStorageResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/n8n-setup`),
        fetch(`${API_BASE_URL}/golden-set-status`),
        fetch(`${API_BASE_URL}/rag-storage-status`),
      ])

      if (n8nResponse.ok) {
        const payload = (await n8nResponse.json()) as N8nSetupResponse
        setN8nSetupState(payload.imported ? "ready" : "missing")
      } else {
        setN8nSetupState("missing")
      }

      if (goldenSetResponse.ok) {
        setGoldenSetStatus((await goldenSetResponse.json()) as GoldenSetStatusResponse)
      } else {
        setGoldenSetStatus(null)
      }

      if (ragStorageResponse.ok) {
        setRagStorageStatus((await ragStorageResponse.json()) as RagStorageStatusResponse)
      } else {
        setRagStorageStatus(null)
      }
    } catch {
      setN8nSetupState("missing")
      setGoldenSetStatus(null)
      setRagStorageStatus(null)
    }

    setIsRagUpdateOpen(true)
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
            <Flex align="center" gap="1.5" mb="3">
              <HiOutlineCubeTransparent aria-hidden="true" size={30} />
              <Heading size="2xl">Devbase</Heading>
              <Tooltip
                content="check out the author!"
                placement="bottom"
                showArrow
              >
                <Badge
                  asChild
                  bg="orange.300"
                  color="white"
                  display="inline-flex"
                  alignItems="center"
                  gap="1"
                  lineHeight="1"
                  ms="4"
                  ps="2"
                  pe="2.5"
                  py="1"
                  transform="translateY(2px)"
                >
                  <Link
                    href="https://github.com/micattoc"
                    target="_blank"
                    rel="noreferrer"
                    textDecoration="none"
                    _hover={{ textDecoration: "none", bg: "orange.600" }}
                  >
                    <HiAtSymbol aria-hidden="true" />
                    micattoc
                  </Link>
                </Badge>
              </Tooltip>
            </Flex>
            <Text color="fg.muted" lineHeight="1.6" mt="1">
              <Highlight
                query={["review risks"]}
                styles={{ px: "0.5", fontWeight: "semibold", fontStyle: "italic", }}
              >
                Changing code? Describe the change to review risks based on current progress recorded in GitHub.
              </Highlight>
            </Text>
          </Box>

          <Separator />

          <Box bg="gray.100" p="4" borderRadius="md" mt="3" mb="5">
            <Stack gap="5" mb="2">
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
                <InputGroup startAddon="github.com/">
                    <Input
                      value={repo}
                      onChange={(event) => handleInputChange(event.target.value, setRepo)}
                      fontSize="md"
                      bg="white"
                      borderColor="border.emphasized"
                      placeholder="owner/repo"
                    />
                </InputGroup>
                
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
                  bg="white"
                  borderColor="border.emphasized"
                  placeholder="I am changing request body parsing for mocked endpoints..."
                />
                <Button
                  bg="black"
                  color="white"
                  width="fit-content"
                  alignSelf="center"
                  disabled={!hasRequiredInput || previewState === "loading"}
                  onClick={handleGenerateReport}
                >
                  {previewState === "loading" ? "Generating report" : "Generate report"}
                </Button>
              </Stack>
            </Stack>
          </Box>

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
                onClick={openRagUpdateDrawer}
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
                <Stack gap="1">
                  <Drawer.Title>Update RAG</Drawer.Title>
                  <Text color="fg.muted" fontSize="sm">
                    {lastUpdatedText}
                  </Text>
                </Stack>
              </Drawer.Header>
              <Drawer.Body>
                <Stack gap="8">
                  <Stack align="center" gap="8">
                    <Stack width="full" gap="3">
                      {goldenSetStatus?.established ? (
                        <Alert.Root status="success">
                          <Alert.Indicator>
                            <HiOutlineDocumentText />
                          </Alert.Indicator>

                          <Stack gap="1">
                            <Alert.Title>Golden set is available</Alert.Title>
                            <Alert.Description>
                              {goldenSetStatus.case_count} cases are ready for eval check.
                            </Alert.Description>
                          </Stack>
                        </Alert.Root>
                      ) : (
                        <Alert.Root status="error">
                          <Alert.Indicator />
                          <Stack gap="1">
                            <Alert.Title>Golden set is empty</Alert.Title>
                            <Alert.Description>
                              Add cases to the set locally. Follow README instructions.
                            </Alert.Description>
                          </Stack>
                        </Alert.Root>
                      )}

                      {n8nSetupState === "ready" ? (
                        <Alert.Root status="info">
                          <Alert.Indicator>
                            <HiOutlineCog />
                          </Alert.Indicator>
                          <Stack gap="1">
                            <Alert.Title>n8n is ready</Alert.Title>
                            <Alert.Description>
                              Ensure workflow container is running locally before starting.
                            </Alert.Description>
                          </Stack>
                        </Alert.Root>
                      ) : (
                        <Alert.Root status="error">
                          <Alert.Indicator />
                          <Stack gap="1">
                            <Alert.Title>n8n is not setup</Alert.Title>
                            <Alert.Description>
                              To evaluate LLM quality, setup the n8n eval workflow locally.
                            </Alert.Description>
                          </Stack>
                        </Alert.Root>
                      )}
                    </Stack>

                    {isRagUpdateConfigured && !hasStartedRagUpdate && (
                      <>
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

                        <Button
                          bg="black"
                          color="white"
                          width="fit-content"
                          mt="2"
                          onClick={handleStartRagUpdate}
                        >
                          Pull in data
                        </Button>
                      </>
                    )}
                  </Stack>

                  {hasStartedRagUpdate && (
                    <RagUpdateTimeline
                      prFetchLimit={prFetchLimit}
                      issueFetchLimit={issueFetchLimit}
                      stage={ragUpdateStage}
                      result={qualityGateResult}
                      ingestResult={githubIngestResult}
                    />
                  )}
                </Stack>
              </Drawer.Body>
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
              <Text color="fg.muted" fontSize="sm" mt="1">
                {ragLastUpdatedText}
              </Text>
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
              <ReportSegments sections={reportSections} />
              <Sources sources={reportSources} />
            </>
          )}
        </Stack>
      </Box>
    </Grid>
  )
}
