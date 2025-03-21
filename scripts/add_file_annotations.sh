#!/bin/bash
# File: scripts/add_file_annotations.sh

# Get the root directory of the project (one step up from the script location)
ROOT_DIR=$(dirname $(dirname $(realpath "$0")))

# Function to annotate a file
annotate_file() {
  local file_path=$1
  local relative_path=${file_path#$ROOT_DIR/} # Strip the root directory prefix
  relative_path=${relative_path#./} # Remove leading ./ if present

  # Read the first line of the file
  local first_line
  first_line=$(head -n 1 "$file_path")

  # Check if the first line is a valid annotation
  if [[ $first_line == "// File: "* ]]; then
    if [[ $first_line != "// File: $relative_path" ]]; then
      # Update incorrect annotation
      sed -i "" "1s|.*|// File: $relative_path|" "$file_path"
    fi

    # Ensure there is an empty line after the annotation
    local second_line
    second_line=$(sed -n '2p' "$file_path")
    if [[ -n $second_line ]]; then
      sed -i "" "1a\\
" "$file_path"
    fi
  else
    # Add annotation and an empty line at the top
    sed -i "" "1s|^|// File: $relative_path\\
\\
|" "$file_path"
  fi
}

# Find all source code files in the React Native project, excluding node_modules
find "$ROOT_DIR" \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" | while read -r file; do
  annotate_file "$file"
done

echo "Annotation process completed."
