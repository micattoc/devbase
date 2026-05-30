import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Input,
  Link,
  Portal,
  SegmentGroup,
  Separator,
  Stack,
  Text,
  Textarea,
  Tooltip as ChakraTooltip,
} from "@chakra-ui/react"
import { type ReactNode, useState } from "react"
import { FiExternalLink } from "react-icons/fi"
import {
  HiChatAlt2,
  HiInformationCircle,
  HiLockClosed,
  HiOutlineCubeTransparent,
} from "react-icons/hi"

const TITLE_WORD_LIMIT = 5

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
      {status === "Open" ? (
        <HiChatAlt2 aria-hidden="true" />
      ) : (
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
      <Box bg="white" borderWidth="1px" borderRadius="lg" p="5">
        <Heading size="md" mb="3">
          Pull Requests
        </Heading>
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
        <Heading size="md" mb="3">
          Issues
        </Heading>
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
            <Flex align="center" gap="2" mb="3">
              <HiOutlineCubeTransparent aria-hidden="true" size={30} />
              <Heading size="2xl">Devbase</Heading>
            </Flex>
            <Stack gap="2" mt="1">
              <Text color="fg.muted">Ask before changing code.</Text>
              <Text color="fg.muted">
                We pull in GitHub data to help you plan.
              </Text>
            </Stack>
          </Box>

          <Separator />

          <Stack gap="3">
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
            <Input value="mockoon/mockoon" readOnly fontSize="md" />
          </Stack>

          <Stack gap="3">
            <Heading size="md">
              Planned change
            </Heading>
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

          <ReportSegments />

          <Sources />
        </Stack>
      </Box>
    </Grid>
  )
}
