#!/usr/bin/env python3
"""
Repository Index Generator
Walks a repository, extracts metadata, symbols, and key files.
Outputs a structured JSON index for efficient LLM analysis.
"""

import json
import os
import sys
import argparse
import ast
import re
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

# Token estimation (approximate)
try:
    import tiktoken
    HAS_TIKTOKEN = True
except ImportError:
    HAS_TIKTOKEN = False


class SymbolExtractor:
    """Extract symbols (functions, classes, etc.) from source files."""
    
    @staticmethod
    def extract_python(file_path: str) -> List[Dict[str, Any]]:
        """Extract symbols from Python files using AST."""
        symbols = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                tree = ast.parse(f.read())
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    symbols.append({
                        "name": node.name,
                        "type": "function",
                        "line": node.lineno
                    })
                elif isinstance(node, ast.ClassDef):
                    symbols.append({
                        "name": node.name,
                        "type": "class",
                        "line": node.lineno
                    })
        except Exception as e:
            print(f"Warning: Could not parse {file_path}: {e}", file=sys.stderr)
        
        return symbols
    
    @staticmethod
    def extract_javascript(file_path: str) -> List[Dict[str, Any]]:
        """Extract symbols from JavaScript/TypeScript files using regex."""
        symbols = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Function declarations
            for match in re.finditer(r'(?:function|const|let|var)\s+(\w+)\s*(?:=|\()', content):
                line_num = content[:match.start()].count('\n') + 1
                symbols.append({
                    "name": match.group(1),
                    "type": "function",
                    "line": line_num
                })
            
            # Class declarations
            for match in re.finditer(r'class\s+(\w+)', content):
                line_num = content[:match.start()].count('\n') + 1
                symbols.append({
                    "name": match.group(1),
                    "type": "class",
                    "line": line_num
                })
            
            # Remove duplicates, keep first occurrence
            seen = set()
            unique_symbols = []
            for sym in symbols:
                key = (sym['name'], sym['type'])
                if key not in seen:
                    seen.add(key)
                    unique_symbols.append(sym)
            symbols = unique_symbols
        
        except Exception as e:
            print(f"Warning: Could not parse {file_path}: {e}", file=sys.stderr)
        
        return symbols
    
    @staticmethod
    def extract_go(file_path: str) -> List[Dict[str, Any]]:
        """Extract symbols from Go files using regex."""
        symbols = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Function declarations
            for match in re.finditer(r'func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(', content):
                line_num = content[:match.start()].count('\n') + 1
                symbols.append({
                    "name": match.group(1),
                    "type": "function",
                    "line": line_num
                })
            
            # Type declarations
            for match in re.finditer(r'type\s+(\w+)\s+(?:struct|interface)', content):
                line_num = content[:match.start()].count('\n') + 1
                symbols.append({
                    "name": match.group(1),
                    "type": "type",
                    "line": line_num
                })
        
        except Exception as e:
            print(f"Warning: Could not parse {file_path}: {e}", file=sys.stderr)
        
        return symbols
    
    @staticmethod
    def extract(file_path: str) -> List[Dict[str, Any]]:
        """Dispatch to appropriate extractor based on file extension."""
        ext = Path(file_path).suffix.lower()
        
        if ext == '.py':
            return SymbolExtractor.extract_python(file_path)
        elif ext in ['.js', '.ts', '.jsx', '.tsx']:
            return SymbolExtractor.extract_javascript(file_path)
        elif ext == '.go':
            return SymbolExtractor.extract_go(file_path)
        
        return []


class RepositoryIndexer:
    """Main indexer for repository analysis."""
    
    def __init__(self, repo_path: str, exclude_patterns: Optional[List[str]] = None,
             max_file_size: int = 1000000, extract_symbols: bool = True,
             filter_paths: Optional[List[str]] = None):
        self.repo_path = Path(repo_path).expanduser().resolve()
        self.filter_paths = self._normalize_filter_paths(filter_paths or [])
        self.exclude_patterns = exclude_patterns or ['.git', 'node_modules', '.venv', '__pycache__',
                                                      'build', 'dist', '.egg-info', '.pytest_cache']
        self.max_file_size = max_file_size
        self.extract_symbols = extract_symbols
        self.key_file_names = {
            'README.md', 'README.txt', 'CHANGELOG.md', 'LICENSE', 'setup.py',
            'package.json', 'requirements.txt', 'Dockerfile', '.github', 'Makefile',
            'go.mod', 'Cargo.toml', 'pom.xml', 'build.gradle', 'tsconfig.json'
        }

    @staticmethod
    def _normalize_filter_paths(paths: List[str]) -> List[str]:
        """Normalize filter roots (POSIX, no leading ./ or trailing slashes)."""
        out = []
        for p in paths:
            if not (p or "").strip():
                continue
            norm = Path(p.strip()).as_posix().strip("/")
            if norm:
                out.append(norm)
        return out

    def _rel_matches_filters(self, rel_posix: str) -> bool:
        """True if rel_posix is exactly a filter root or inside one of the filter trees."""
        if not self.filter_paths:
            return True
        rel_posix = rel_posix.replace("\\", "/")
        for fp in self.filter_paths:
            if rel_posix == fp or rel_posix.startswith(fp + "/"):
                return True
        return False

    def _should_descend(self, dir_path: Path) -> bool:
        """When filtering, only walk subtrees that can contain a matching path."""
        if not self.filter_paths:
            return True
        try:
            dir_rel = dir_path.resolve().relative_to(self.repo_path).as_posix()
        except ValueError:
            dir_rel = dir_path.as_posix()
        for fp in self.filter_paths:
            # Descend if: filter is inside this dir, this dir is inside filter, or same node
            if fp.startswith(dir_rel + "/") or dir_rel.startswith(fp + "/") or fp == dir_rel:
                return True
        return False

    def _should_exclude(self, path: Path) -> bool:
        """Check if path matches exclude patterns."""
        for pattern in self.exclude_patterns:
            if pattern in path.parts:
                return True
        return False

    def _is_text_file(self, file_path: Path) -> bool:
        """Check if file is likely text-based."""
        binary_extensions = {'.pyc', '.o', '.so', '.dll', '.exe', '.zip', '.gz',
                            '.png', '.jpg', '.gif', '.ico', '.db', '.sqlite'}
        return file_path.suffix.lower() not in binary_extensions
    
    def index(self) -> Dict[str, Any]:
        """Generate the complete index."""
        print(f"Indexing repository: {self.repo_path}", file=sys.stderr)
        
        structure = {}
        all_files = []
        symbols = {}
        key_files = []
        total_size = 0
        file_count = 0
        
        for root, dirs, files in os.walk(self.repo_path):
            # Exclude directories in-place
            dirs[:] = [
                d
                for d in dirs
                if not self._should_exclude(Path(root) / d)
                and self._should_descend((Path(root) / d).resolve())
            ]

            for file in files:
                file_path = Path(root) / file
                rel_path = file_path.relative_to(self.repo_path)
                rel_posix = rel_path.as_posix()

                # Skip excluded
                if self._should_exclude(rel_path):
                    continue
                if not self._rel_matches_filters(rel_posix):
                    continue
                
                try:
                    file_size = file_path.stat().st_size
                    
                    # Skip large files
                    if file_size > self.max_file_size:
                        continue
                    
                    total_size += file_size
                    file_count += 1
                    
                    all_files.append(rel_posix)
                    
                    # Check if key file
                    if file in self.key_file_names or any(file.startswith(kf) for kf in self.key_file_names):
                        key_files.append(rel_posix)
                    
                    # Extract symbols if enabled and text file
                    if self.extract_symbols and self._is_text_file(file_path):
                        extracted = SymbolExtractor.extract(str(file_path))
                        if extracted:
                            symbols[rel_posix] = extracted
                
                except Exception as e:
                    print(f"Warning: Could not process {rel_path}: {e}", file=sys.stderr)
        
        # Build nested structure from file paths (POSIX segments for cross-platform)
        for file_path in all_files:
            parts = Path(file_path).parts
            current = structure
            for part in parts[:-1]:
                if part not in current:
                    current[part] = {}
                current = current[part]
            if not isinstance(current, dict):
                continue
            if parts[-1] not in current:
                current[parts[-1]] = None
        
        # Token estimation
        index_data = {
            "metadata": {
                "repo_path": str(self.repo_path),
                "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "total_files": file_count,
                "total_size_bytes": total_size,
                "estimated_tokens": self._estimate_tokens(file_count, total_size)
            },
            "structure": structure,
            "files": all_files,
            "symbols": symbols,
            "key_files": key_files
        }
        
        print(f"Indexed {file_count} files, {total_size / 1024:.1f} KB, {len(symbols)} files with symbols",
              file=sys.stderr)
        
        return index_data
    
    @staticmethod
    def _estimate_tokens(file_count: int, total_size: int) -> Dict[str, Any]:
        """Estimate token usage."""
        # Rough estimate: ~4 chars per token
        content_tokens = total_size // 4
        metadata_tokens = (file_count * 5) + 100  # ~5 tokens per file in metadata
        
        estimate = {
            "content_estimate": content_tokens,
            "metadata_estimate": metadata_tokens,
            "total_estimate": content_tokens + metadata_tokens
        }
        
        if HAS_TIKTOKEN:
            try:
                enc = tiktoken.get_encoding("cl100k_base")
                # Encode a sample to calibrate
                sample = json.dumps(estimate)
                estimate["calibrated_estimate"] = len(enc.encode(sample))
            except Exception:
                pass
        
        return estimate


def main():
    parser = argparse.ArgumentParser(
        description='Generate a structured index of a repository for efficient LLM analysis.'
    )
    parser.add_argument('--repo-path', '-r', required=True, help='Path to the repository')
    parser.add_argument('--output', '-o', default='repo-index.json', help='Output JSON file')
    parser.add_argument('--exclude-patterns', '-e', default='.git,node_modules,.venv,__pycache__,build,dist',
                       help='Comma-separated patterns to exclude')
    parser.add_argument('--max-file-size', '-m', type=int, default=1000000,
                       help='Maximum file size to include (bytes)')
    parser.add_argument('--no-symbols', action='store_true', help='Skip symbol extraction')
    parser.add_argument('--filter-paths', '-fp', default='', help='Comma-separated list of paths to include (empty = include all)')
    
    args = parser.parse_args()
    
    exclude = [p.strip() for p in args.exclude_patterns.split(',')]
    
    filter_paths = [p.strip() for p in args.filter_paths.split(',') if p.strip()]

    indexer = RepositoryIndexer(
        repo_path=args.repo_path,
        exclude_patterns=exclude,
        max_file_size=args.max_file_size,
        extract_symbols=not args.no_symbols,
        filter_paths=filter_paths
    )
    
    index_data = indexer.index()
    
    # Write output
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, indent=2)
    
    print(f"Index saved to: {args.output}", file=sys.stderr)
    print(json.dumps({
        "status": "success",
        "output_file": args.output,
        "files_indexed": index_data["metadata"]["total_files"],
        "size_kb": index_data["metadata"]["total_size_bytes"] / 1024
    }, indent=2))


if __name__ == '__main__':
    main()