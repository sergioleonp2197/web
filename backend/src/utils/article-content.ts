export type ArticleStatus = "published" | "draft";
export type ArticleContentFormat = "plain" | "markdown";

export type ParsedArticleContent = {
  body: string;
  allowComments: boolean;
  contentFormat: ArticleContentFormat;
  status: ArticleStatus;
  readingTimeMinutes: number;
};

type SerializableArticleContent = {
  content?: unknown;
  body?: unknown;
  allowComments?: unknown;
  contentFormat?: unknown;
  status?: unknown;
  readingTimeMinutes?: unknown;
};

const MAX_READING_TIME_MINUTES = 120;
const WORDS_PER_MINUTE = 220;

const normalizeStatus = (value: unknown): ArticleStatus => {
  return value === "draft" ? "draft" : "published";
};

const normalizeContentFormat = (value: unknown): ArticleContentFormat => {
  return value === "markdown" ? "markdown" : "plain";
};

const clampReadingTime = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(MAX_READING_TIME_MINUTES, Math.max(1, Math.round(value)));
};

export const estimateReadingTimeMinutes = (body: string): number => {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) {
    return 1;
  }

  return clampReadingTime(Math.ceil(words / WORDS_PER_MINUTE));
};

const buildParsedArticleContent = (payload: {
  body: string;
  allowComments?: unknown;
  contentFormat?: unknown;
  status?: unknown;
  readingTimeMinutes?: unknown;
}): ParsedArticleContent => {
  const body = payload.body.trim();
  const readingTimeMinutes =
    typeof payload.readingTimeMinutes === "number"
      ? clampReadingTime(payload.readingTimeMinutes)
      : estimateReadingTimeMinutes(body);

  return {
    body,
    allowComments: payload.allowComments !== false,
    contentFormat: normalizeContentFormat(payload.contentFormat),
    status: normalizeStatus(payload.status),
    readingTimeMinutes
  };
};

export const parseArticleBody = (rawBody: string): ParsedArticleContent => {
  try {
    const parsed = JSON.parse(rawBody) as SerializableArticleContent;
    if (parsed && typeof parsed === "object") {
      const content =
        typeof parsed.content === "string"
          ? parsed.content
          : typeof parsed.body === "string"
            ? parsed.body
            : null;

      if (content !== null) {
        return buildParsedArticleContent({
          body: content,
          allowComments: parsed.allowComments,
          contentFormat: parsed.contentFormat,
          status: parsed.status,
          readingTimeMinutes: parsed.readingTimeMinutes
        });
      }
    }
  } catch {
    // Legacy plain text article body is still supported.
  }

  return buildParsedArticleContent({
    body: rawBody
  });
};

export const serializeArticleBody = (payload: {
  body: string;
  allowComments?: unknown;
  contentFormat?: unknown;
  status?: unknown;
  readingTimeMinutes?: unknown;
}): string => {
  const normalized = buildParsedArticleContent(payload);

  return JSON.stringify({
    content: normalized.body,
    allowComments: normalized.allowComments,
    contentFormat: normalized.contentFormat,
    status: normalized.status,
    readingTimeMinutes: normalized.readingTimeMinutes
  });
};

export const canUserReadArticle = (payload: {
  rawBody: string;
  authorId: string;
  currentUserId?: string;
}): boolean => {
  const content = parseArticleBody(payload.rawBody);
  if (content.status === "published") {
    return true;
  }

  return payload.currentUserId === payload.authorId;
};
