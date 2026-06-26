import { useSearch } from "wouter";

export function useSearchParam(name) {
  const search = useSearch();
  return new URLSearchParams(search).get(name);
}
