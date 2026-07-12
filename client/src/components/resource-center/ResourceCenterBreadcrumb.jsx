// M21-C — breadcrumb trail matching the URL hierarchy exactly (PAR §5: "RepMail
// Resource Center > Deliverability > {article title}"). Reuses the existing
// shadcn Breadcrumb primitives — this is a thin composition, not a new
// component system. The trail this renders is also the source of truth for
// BreadcrumbList JSON-LD (M21-E), so both stay in sync by construction —
// deriving the schema from the same `items` prop, not a parallel hand-kept copy.
import { Fragment } from "react";
import { Link } from "wouter";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// items: [{ label, href }, ...] — last item has no href (current page).
export default function ResourceCenterBreadcrumb({ items }) {
  if (!items?.length) return null;
  return (
    <Breadcrumb data-testid="resource-center-breadcrumb">
      <BreadcrumbList>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            // Fragment (not a display:contents span): keeps the <li> items as
            // direct children of the <ol>, which the previous span wrapper
            // violated (axe list / listitem failures). M23-II-F fix.
            <Fragment key={item.label}>
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// Shared by the article/Academy page templates and M21-E's BreadcrumbList
// JSON-LD generator — one function, not two hand-kept copies of the same trail.
export function buildBreadcrumbItems({ resourceCenterName, resourceCenterHref, academy, academyHref, articleTitle }) {
  const items = [{ label: resourceCenterName, href: resourceCenterHref }];
  if (academy) items.push({ label: academy.name, href: academyHref });
  if (articleTitle) items.push({ label: articleTitle });
  return items;
}
