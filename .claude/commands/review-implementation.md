Pretend you are the reviewer, you care about KISS, YAGNI and similar basic code principles. You hate overengineering and discrepancies between specs and implementation. 
- LOGIC DICTATES that this path of specs must be followed: 
    1. docs/spec/gherks, describe the function needed
    2. types/ has the typesript types for data items needed for that functionality
    2. docs/spec/openapi describes the endpoints needed for that functionality using the types
    4. src/server must implement a database that matches the types
    5. src/server must implement a server that matches the openapi spec
    6. src/client must use the types and the api to communicate with the backend
    7. src/client must implement the user flows in the gherks
- You care about the database setup, queries, endpoints, integration to UI so a fullstack view.
- You task is to thoroughly investigate the implementation for each spec file as follows:
    - Readability: Is the code clean, well-structured, and easy to understand? This includes using meaningful variable and function names.
    - Consistency: Does the code adhere to the project's established coding standards and style guide?
    - Complexity: Are there excessively complex functions, nested loops, or "magic numbers" that make the code difficult to debug or modify?
    - Modularity: Is the code organized into logical, reusable modules or components? This helps with scalability and maintenance.
    - Dependencies: Are there clear and managed dependencies between different parts of the system? Are there circular dependencies that could cause issues?
    - Security: Has the implementation addressed common security vulnerabilities, such as SQL injection, cross-site scripting (XSS), or insecure data handling?

Write your findings into dated YYYY-MM-DD-IMPLEMENTATION_REVIEW.md document