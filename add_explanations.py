import json

# Load the questions
with open('src/questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

# Domain mapping based on exam structure
DOMAINS = {
    'platform': 'Databricks Intelligence Platform',
    'ingestion': 'Development and Ingestion',
    'processing': 'Data Processing & Transformations',
    'production': 'Productionizing Data Pipelines',
    'governance': 'Data Governance & Quality'
}

def categorize_question(question_text, options, code=None):
    """Categorize question into appropriate domain based on keywords"""
    text = (question_text + ' ' + ' '.join(options) + ' ' + (code or '')).lower()
    
    # Databricks Intelligence Platform keywords
    platform_keywords = ['workspace', 'cluster', 'notebook', 'catalog', 'architecture', 'audit log', 
                        'serverless', 'compute', 'repos', 'git', 'version control', 'databricks sql',
                        'unity catalog setup', 'platform', 'interface', 'cli', 'sdk', 'api']
    
    # Development and Ingestion keywords
    ingestion_keywords = ['ingest', 'kafka', 'auto loader', 'streaming', 'readstream', 'cloud_files',
                         'extract', 'load', 'source', 'external table', 'location', 'read', 'format',
                         'jdbc', 'delta sharing', 'incremental']
    
    # Data Processing & Transformations keywords
    processing_keywords = ['transform', 'aggregate', 'join', 'union', 'pivot', 'unpivot', 'window',
                          'groupby', 'filter', 'select', 'pyspark', 'spark sql', 'udf', 'function',
                          'array', 'struct', 'explode', 'collect', 'map', 'reduce', 'withcolumn']
    
    # Productionizing Data Pipelines keywords
    production_keywords = ['workflow', 'job', 'schedule', 'orchestrate', 'dlt', 'delta live tables',
                          'pipeline', 'production', 'deploy', 'task', 'repair', 'asset bundles',
                          'ci/cd', 'testing', 'monitoring']
    
    # Data Governance & Quality keywords
    governance_keywords = ['grant', 'privilege', 'access control', 'security', 'quality', 'constraint',
                          'expect', 'vacuum', 'optimize', 'z-order', 'lineage', 'unity catalog',
                          'schema evolution', 'data quality', 'governance', 'compliance']
    
    # Score each category
    scores = {
        'platform': sum(1 for kw in platform_keywords if kw in text),
        'ingestion': sum(1 for kw in ingestion_keywords if kw in text),
        'processing': sum(1 for kw in processing_keywords if kw in text),
        'production': sum(1 for kw in production_keywords if kw in text),
        'governance': sum(1 for kw in governance_keywords if kw in text)
    }
    
    # Get category with highest score
    category = max(scores, key=scores.get)
    
    # If no clear match, try to infer from specific patterns
    if scores[category] == 0:
        if 'grant' in text or 'privilege' in text or 'access' in text:
            category = 'governance'
        elif 'workflow' in text or 'job' in text or 'schedule' in text:
            category = 'production'
        elif 'ingest' in text or 'load' in text or 'extract' in text:
            category = 'ingestion'
        elif 'transform' in text or 'join' in text or 'select' in text:
            category = 'processing'
        else:
            category = 'platform'
    
    return DOMAINS[category]

def generate_explanation(question, options, correct_index, code=None):
    """Generate explanation based on the correct answer"""
    correct_answer = options[correct_index]
    q_lower = question.lower()
    
    # Generate contextual explanation
    if 'show catalogs' in correct_answer.lower():
        return "SHOW CATALOGS is the correct command to display all catalogs in the metastore in Databricks."
    elif 'single integer' in correct_answer.lower():
        return "The collect() method returns a list of rows, and accessing [0]['total'] retrieves the first row's 'total' column value as a single integer."
    elif 'parquet' in correct_answer.lower() and 'delta' in q_lower:
        return "Delta Lake uses Parquet as the underlying file format for data storage, adding a transaction log for ACID properties."
    elif 'asset bundles' in correct_answer.lower():
        return "Databricks Asset Bundles provide a standardized way to package, deploy, and manage data pipelines with version control and testing capabilities."
    elif 'kafka' in q_lower and 'dlt' in q_lower:
        return "Delta Live Tables (DLT) supports reading from Kafka using spark.readStream with the kafka format and appropriate connection options."
    elif 'one language per cell' in correct_answer.lower():
        return "Databricks cells support only one default language, though you can use magic commands (%python, %sql, %scala, %r) to switch languages between cells."
    elif 'repair' in correct_answer.lower() and 'workflow' in q_lower:
        return "The repair task option allows rerunning a failed workflow task after fixing issues, without restarting the entire workflow."
    elif 'expect' in correct_answer and 'on violation drop row' in correct_answer:
        return "DLT quality constraints with EXPECT and ON VIOLATION DROP ROW filter out rows that don't meet the specified condition."
    elif 'grant' in correct_answer.lower() and 'use catalog' in correct_answer.lower():
        return "Granting CREATE TABLE on schema, USE SCHEMA on schema, and USE CATALOG on catalog provides the minimum necessary privileges for creating tables."
    elif 'spot instances' in correct_answer.lower():
        return "Job clusters with spot instances enabled provide the most cost-effective solution for small workloads since they use cheaper spot pricing and terminate after job completion."
    elif 'auto loader' in q_lower and 'batch and streaming' in correct_answer:
        return "Auto Loader efficiently processes new files from cloud storage, supporting both batch and streaming modes with automatic schema inference and evolution."
    elif 'serverless' in correct_answer.lower():
        return "Databricks Serverless compute automatically scales resources based on workload demands without manual cluster management, optimizing cost and performance."
    elif 'json' in correct_answer.lower() and 'audit' in q_lower:
        return "Databricks audit logs use JSON format for structured event data, making it easy to parse and analyze security and usage information."
    elif 'delta sharing' in correct_answer.lower():
        return "Delta Sharing is an open protocol for secure data sharing across different platforms without copying data, supporting Unity Catalog integration."
    elif 'location' in correct_answer.lower() and 'external' in q_lower:
        return "CREATE TABLE with a LOCATION clause creates an external table that references data in external storage without moving it into managed storage."
    elif 'dlt' in q_lower or 'delta live tables' in correct_answer.lower():
        return "Delta Live Tables (DLT) provides declarative pipeline development with automatic data quality checks, schema evolution, and simplified maintenance."
    elif 'gold' in q_lower and 'read-optimized' in correct_answer.lower():
        return "The Gold layer contains business-level aggregates and optimized tables for read performance, typically denormalized for analytical queries."
    elif 'lineage' in q_lower and 'column-level' in correct_answer:
        return "Unity Catalog lineage provides interactive visualization of data dependencies across tables, notebooks, jobs, and dashboards with column-level tracking."
    else:
        # Generic explanation
        return f"The correct answer is '{correct_answer}' based on Databricks best practices and platform capabilities."

# Process questions
updated_count = 0
for q in questions:
    # Skip if already has explanation and domain
    if 'explanation' in q and 'domain' in q:
        continue
    
    # Add domain
    domain = categorize_question(
        q['question'], 
        q['options'], 
        q.get('code')
    )
    q['domain'] = domain
    
    # Add explanation
    # Handle both single and multi-select questions
    correct_idx = q.get('correctIndex')
    if correct_idx is None:
        correct_idx = q.get('correctIndices', [0])[0]  # Use first correct answer for multi-select
    
    explanation = generate_explanation(
        q['question'],
        q['options'],
        correct_idx,
        q.get('code')
    )
    q['explanation'] = explanation
    
    updated_count += 1

# Save updated questions
with open('src/questions.json', 'w', encoding='utf-8') as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)

print(f"✅ Updated {updated_count} questions with explanations and domains")
print(f"📊 Total questions: {len(questions)}")

# Print distribution by domain
domain_counts = {}
for q in questions:
    domain = q.get('domain', 'Unknown')
    domain_counts[domain] = domain_counts.get(domain, 0) + 1

print("\n📈 Distribution by domain:")
for domain, count in sorted(domain_counts.items(), key=lambda x: -x[1]):
    percentage = (count / len(questions)) * 100
    print(f"  {domain}: {count} questions ({percentage:.1f}%)")
