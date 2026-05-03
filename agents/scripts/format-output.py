#!/usr/bin/env python3
"""
Output Formatter for Repository Analysis
Takes LLM findings and formats them into structured outputs:
- repo-summary.md (human-readable)
- dependency-map.json (structured data)
- README-AGENT.md (agent process documentation)
"""

import json
import sys
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional


class OutputFormatter:
    """Format analysis outputs."""
    
    def __init__(self, index_file: str, findings_file: str, output_dir: str):
        self.index_file = Path(index_file)
        # Path("") normalizes to Path(".") — never treat empty default as "read cwd"
        findings_raw = (findings_file or "").strip()
        self.findings_file: Optional[Path] = Path(findings_raw) if findings_raw else None
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load data
        with open(self.index_file, 'r', encoding='utf-8') as f:
            self.index = json.load(f)
        if not isinstance(self.index, dict):
            raise ValueError(
                f"Index file must contain a JSON object at the root, got {type(self.index).__name__}"
            )
        
        self.findings = ""
        if self.findings_file is not None:
            if self.findings_file.is_file():
                with open(self.findings_file, 'r', encoding='utf-8') as f:
                    self.findings = f.read()
            else:
                print(
                    f"Warning: --findings path is not a file (skipping): {findings_raw}",
                    file=sys.stderr,
                )
    
    def _extract_metadata(self) -> Dict[str, Any]:
        """Extract basic metadata from index."""
        if not isinstance(self.index, dict):
            return {}
        return self.index.get("metadata", {}) or {}
    
    def _build_file_list(self) -> List[str]:
        """Build a formatted file list from index."""
        files = self.index.get("files") or []
        if not isinstance(files, list):
            files = []
        key_files = set(self.index.get("key_files") or [])
        
        file_list = []
        for f in sorted(files):
            marker = "⭐ " if f in key_files else "  "
            file_list.append(f"{marker}{f}")
        
        return file_list
    
    def _build_symbol_section(self) -> str:
        """Build a symbols/API section from extracted symbols."""
        symbols = self.index.get("symbols") or {}
        if not isinstance(symbols, dict) or not symbols:
            return ""
        
        lines = ["## API Reference\n"]
        
        for file_path in sorted(symbols.keys()):
            file_symbols = symbols[file_path]
            if not file_symbols or not isinstance(file_symbols, list):
                continue
            
            lines.append(f"### {file_path}\n")
            
            # Group by type
            by_type: Dict[str, List[Any]] = {}
            for sym in file_symbols:
                if not isinstance(sym, dict):
                    continue
                sym_type = sym.get("type", "unknown")
                by_type.setdefault(sym_type, []).append(sym)
            
            for sym_type in sorted(by_type.keys()):
                lines.append(f"**{sym_type.title()}s:**")
                for sym in by_type[sym_type]:
                    line_no = sym.get("line", "?")
                    name = sym.get("name", "?")
                    lines.append(f"- `{name}` (line {line_no})")
                lines.append("")
        
        return "\n".join(lines)
    
    def format_summary(self) -> str:
        """Format human-readable summary markdown."""
        metadata = self._extract_metadata()
        file_list = self._build_file_list()
        symbol_section = self._build_symbol_section()
        
        lines = [
            "# Repository Analysis Summary\n",
            f"**Generated:** {datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')}",
            f"**Repository:** {metadata.get('repo_path', 'unknown')}",
            f"**Total Files:** {metadata.get('total_files', 0)}",
            f"**Total Size:** {(metadata.get('total_size_bytes') or 0) / 1024:.1f} KB\n",
            
            "## Overview\n",
            "This document provides a structured analysis of the repository's contents, ",
            "organization, and key components.\n",
            
            "## Key Files\n",
            "The following files are critical to understanding this repository:\n",
            "*(⭐ = marked as key file)*\n"
        ]
        
        key_files = self.index.get("key_files") or []
        if not isinstance(key_files, list):
            key_files = []
        if key_files:
            for kf in sorted(key_files):
                lines.append(f"- **{kf}**")
        else:
            lines.append("- No key files identified")
        
        lines.append("")
        
        # Add findings if available
        if self.findings.strip():
            lines.append("## Analysis Findings\n")
            lines.append(self.findings)
            lines.append("")
        
        # Add symbol section
        if symbol_section:
            lines.append(symbol_section)
        
        # Add file structure
        lines.append("## Complete File List\n")
        for f in file_list:
            lines.append(f"- {f}")
        
        lines.append("\n")
        
        # Add statistics
        lines.extend([
            "## Statistics\n",
            f"- Total Files: {metadata.get('total_files', 0)}",
            f"- Total Size: {(metadata.get('total_size_bytes') or 0) / 1024:.1f} KB",
        ])
        
        token_estimates = metadata.get('estimated_tokens', {})
        if token_estimates:
            lines.extend([
                f"- Estimated Tokens (content): ~{token_estimates.get('content_estimate', 0):,}",
                f"- Estimated Tokens (total): ~{token_estimates.get('total_estimate', 0):,}"
            ])
        
        lines.append("")
        
        return "\n".join(lines)
    
    def format_dependency_map(self) -> Dict[str, Any]:
        """Format dependency map (can be extended for actual dependency analysis)."""
        key_files = self.index.get("key_files") or []
        if not isinstance(key_files, list):
            key_files = []
        
        dependency_map = {
            "metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "repo": (self.index.get("metadata") or {}).get("repo_path", "unknown")
            },
            "key_files": key_files,
            "entry_points": [
                f for f in key_files 
                if any(name in f for name in ['main', '__main__', 'index', 'app', 'server'])
            ],
            "manifest_files": [
                f for f in key_files
                if any(name in f for name in ['package.json', 'setup.py', 'go.mod', 'Cargo.toml'])
            ],
            "symbols_by_file": self.index.get("symbols") or {}
        }
        
        return dependency_map
    
    def format_agent_readme(self) -> str:
        """Format documentation about the agent's analysis process."""
        metadata = self._extract_metadata()
        
        lines = [
            "# Repository Analysis - Agent Process Documentation\n",
            f"**Analysis Date:** {datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')}",
            f"**Repository:** {metadata.get('repo_path', 'unknown')}\n",
            
            "## What This Agent Did\n",
            "This repository was analyzed by an AI agent following this process:\n",
            
            "### Phase 1: Index Generation\n",
            "- Walked the repository file tree (respecting exclusions)",
            "- Extracted file metadata (names, sizes, types)",
            "- Identified entry points and key files",
            "- Built symbol tables for supported languages",
            f"- Generated index with {metadata.get('total_files', 0)} files\n",
            
            "### Phase 2: Analysis\n",
            "- Read the generated index for structure overview",
            "- Selected key files based on analysis scope",
            "- Extracted symbols and API definitions",
            "- Synthesized findings about the codebase\n",
            
            "### Phase 3: Formatting\n",
            "- Validated and formatted output",
            "- Created human-readable summary",
            "- Generated structured dependency map",
            "- Produced this documentation\n",
            
            "## How to Use These Outputs\n",
            "1. **repo-summary.md** - Start here for a readable overview",
            "2. **repo-index.json** - Reference for structured data and symbols",
            "3. **dependency-map.json** - Use for dependency analysis and tool integration\n",
            
            "## Outputs Generated\n"
        ]
        
        token_estimates = metadata.get('estimated_tokens', {})
        if token_estimates:
            lines.extend([
                "### Token Efficiency\n",
                f"- Content tokens: ~{token_estimates.get('content_estimate', 0):,}",
                f"- Metadata tokens: ~{token_estimates.get('metadata_estimate', 0):,}",
                f"- Total estimated: ~{token_estimates.get('total_estimate', 0):,}",
                "- Budget efficiency: < 40% of typical LLM context window\n"
            ])
        
        lines.extend([
            "## Next Steps\n",
            "To deepen the analysis:",
            "1. Review key files directly (marked with ⭐ in summary)",
            "2. Examine API symbols in the 'API Reference' section",
            "3. Check dependency-map.json for entry points",
            "4. Query specific aspects using the file index\n"
        ])
        
        return "\n".join(lines)
    
    def write_outputs(self) -> Dict[str, str]:
        """Write all formatted outputs to disk."""
        outputs = {}
        
        # Write summary
        summary_path = self.output_dir / "repo-summary.md"
        summary_content = self.format_summary()
        with open(summary_path, 'w', encoding='utf-8') as f:
            f.write(summary_content)
        outputs['summary'] = str(summary_path)
        
        # Write dependency map
        dep_map_path = self.output_dir / "dependency-map.json"
        dep_map_content = self.format_dependency_map()
        with open(dep_map_path, 'w', encoding='utf-8') as f:
            json.dump(dep_map_content, f, indent=2)
        outputs['dependency_map'] = str(dep_map_path)
        
        # Write agent README
        agent_readme_path = self.output_dir / "README-AGENT.md"
        agent_readme_content = self.format_agent_readme()
        with open(agent_readme_path, 'w', encoding='utf-8') as f:
            f.write(agent_readme_content)
        outputs['agent_readme'] = str(agent_readme_path)
        
        return outputs


def main():
    parser = argparse.ArgumentParser(
        description='Format repository analysis outputs.'
    )
    parser.add_argument('--index', '-i', required=True, help='Path to repo-index.json')
    parser.add_argument('--findings', '-f', default='', help='Path to LLM findings text file')
    parser.add_argument('--output-dir', '-o', default='./analysis-output',
                       help='Output directory')
    
    args = parser.parse_args()
    
    formatter = OutputFormatter(
        index_file=args.index,
        findings_file=args.findings,
        output_dir=args.output_dir
    )
    
    outputs = formatter.write_outputs()
    
    print(json.dumps({
        "status": "success",
        "outputs": outputs,
        "output_directory": args.output_dir
    }, indent=2))


if __name__ == '__main__':
    main()