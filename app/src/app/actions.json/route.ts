import { NextResponse } from "next/server";
import { ACTIONS_CORS_HEADERS } from "@/lib/actions";

export const GET = () => {
  return NextResponse.json(
    {
      rules: [
        {
          pathPattern: "/track/*",
          apiPath: "/api/actions/back-track?trackId=*",
        },
        {
          pathPattern: "/api/actions/**",
          apiPath: "/api/actions/**",
        },
      ],
    },
    { headers: ACTIONS_CORS_HEADERS }
  );
};

export const OPTIONS = GET;
