/** Shared responsive page boundary for future screen migrations. */
export default function BoutiquePageContainer({
  children,
  className = "",
  as: Tag = "div",
  ...props
}) {
  return (
    <Tag className={`ap-page-container tw:mx-auto tw:w-full ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
