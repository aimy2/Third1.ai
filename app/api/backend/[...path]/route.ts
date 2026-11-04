import { NextRequest, NextResponse } from "next/server";


type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function forwardRequest(
  request: NextRequest,
  context: RouteContext
) {
  const backendUrl = process.env.THIRD1_BACKEND_URL;

  if (!backendUrl) {
    return NextResponse.json(
      { detail: "THIRD1_BACKEND_URL is not configured." },
      { status: 500 }
    );
  }

  const { path } = await context.params;
  const endpoint = path.map(encodeURIComponent).join("/");
  const targetUrl = new URL(
    `${endpoint}`,
    backendUrl.endsWith("/") ? backendUrl : `${backendUrl}/`
  );

  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  try {
    const headers = new Headers();

    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers.set("content-type", contentType);
    }

    const hasBody = !["GET", "HEAD"].includes(request.method);

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });

    const responseBody = await response.text();

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ??
          "application/json",
      },
    });
  } catch (error) {
    console.error("FastAPI proxy error:", error);

    return NextResponse.json(
      { detail: "Could not connect to the Third1 AI backend." },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  return forwardRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  return forwardRequest(request, context);
}