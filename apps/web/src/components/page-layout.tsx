"use client";

import { Suspense, type ReactNode, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
	const pathname = usePathname();
	const mainRef = useRef<HTMLElement>(null);

	useEffect(() => {
		// Focus main content on route change for screen readers
		if (mainRef.current) {
			mainRef.current.focus();
		}
	}, [pathname]);

	return (
		<div className="flex h-svh">
			<Suspense>
				<Sidebar />
			</Suspense>
			<div className="flex flex-col flex-1 overflow-hidden">
				<TopBar />
				<main
					ref={mainRef}
					id="main-content"
					className="flex-1 overflow-auto"
					tabIndex={-1}
					aria-label="Main content"
				>
					{children}
				</main>
			</div>
		</div>
	);
}

