export default function BieuTuongDon({
  kind,
}: {
  kind: "chat" | "image" | "edit" | "delete";
}) {
  return (
    <svg
      aria-hidden="true"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === "chat" ? (
        <>
          <path d="M21 11a9 9 0 0 1-9 9H4l-3 2V11a10 10 0 0 1 20 0Z" />
          <path d="M6 9h10M6 13h7" />
        </>
      ) : kind === "image" ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8" cy="8" r="2" />
          <path d="m3 18 6-6 4 4 3-5 5 7" />
        </>
      ) : kind === "edit" ? (
        <>
          <path d="m4 16 12-12 4 4L8 20H4v-4ZM14 6l4 4" />
        </>
      ) : (
        <>
          <path d="M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
        </>
      )}
    </svg>
  );
}
