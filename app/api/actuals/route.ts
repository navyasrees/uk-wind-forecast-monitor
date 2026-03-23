import { NextRequest, NextResponse } from "next/server";
import { fetchActuals } from "@/lib/elexon";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing required params: from, to" },
      { status: 400 }
    );
  }

  // Basic validation
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const minDate = new Date("2025-01-01T00:00:00Z");
  const now = new Date();

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  if (fromDate < minDate) {
    return NextResponse.json(
      { error: "from must be >= 2025-01-01" },
      { status: 400 }
    );
  }
  if (fromDate >= toDate) {
    return NextResponse.json({ error: "from must be < to" }, { status: 400 });
  }
  if (toDate > now) {
    return NextResponse.json(
      { error: "to must not be in the future" },
      { status: 400 }
    );
  }

  // Cap to 7 days for Vercel Hobby plan safety
  const maxWindowMs = 7 * 24 * 60 * 60 * 1000;
  if (toDate.getTime() - fromDate.getTime() > maxWindowMs) {
    return NextResponse.json(
      { error: "Query window must be ≤ 7 days" },
      { status: 400 }
    );
  }

  try {
    const data = await fetchActuals(from, to);
    return NextResponse.json({
      data,
      meta: { count: data.length, from, to },
    });
  } catch (err) {
    console.error("Error fetching actuals:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
