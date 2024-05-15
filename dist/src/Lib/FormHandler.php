<?php

namespace Lib;

use Lib\StateManager;
use Lib\Validator;

class FormHandler
{
    private $data;
    private $errors;
    private $validated;
    private $isPost;
    private $pathname;
    private StateManager $stateManager;
    private const FORM_STATE = 'pphp_form_state_977A9';
    private const FORM_INPUT_REGISTER = 'pphp_form_input_register_7A16F';
    private const FORM_INPUT_ERRORS = 'pphp_form_input_errors_CBF6C';

    public function __construct($formData = [])
    {
        global $isPost, $pathname;

        $this->isPost = $isPost;
        $this->pathname = $pathname;
        $this->data = $formData;
        $this->errors = [];
        $this->validated = false;

        $this->stateManager = new StateManager();

        if ($this->stateManager->getState(self::FORM_INPUT_REGISTER)) {
            $this->getData();
        }
    }

    /**
     * Validates the form data.
     * 
     * @return bool True if the form data is valid, false otherwise.
     */
    public function validate(): bool
    {
        return empty($this->errors) && $this->validated;
    }

    public function addError($field, $message)
    {
        $this->errors[$field] = $message;
    }

    /**
     * Retrieves the form data and performs validation if the form was submitted.
     *
     * @return mixed An object containing the form data.
     */
    public function getData(): mixed
    {
        if ($this->isPost) {
            if ($inputField = $this->stateManager->getState(self::FORM_INPUT_REGISTER)) {
                foreach ($inputField as $field => $fieldData) {
                    $this->data[$field] = Validator::validateString($this->data[$field] ?? '');
                    $this->validateField($field, $fieldData['rules']);
                }
            }

            $formDataInfo = [
                'data' => $this->data,
                'errors' => $this->errors,
                'validated' => true
            ];

            $this->stateManager->resetState(self::FORM_INPUT_ERRORS, true);
            $this->stateManager->setState([self::FORM_INPUT_ERRORS => $formDataInfo], true);
            $this->stateManager->setState([self::FORM_STATE => $formDataInfo], true);

            redirect($this->pathname);
        } else {
            if ($state = $this->stateManager->getState(self::FORM_STATE)) {
                $this->data = $state['data'] ?? [];
                $this->errors = $state['errors'] ?? [];
                $this->validated = $state['validated'] ?? false;

                $this->stateManager->resetState([self::FORM_STATE, self::FORM_INPUT_REGISTER], true);
            }
        }

        return new \ArrayObject($this->data, \ArrayObject::ARRAY_AS_PROPS);
    }

    /**
     * Retrieves the validation errors from the form state.
     *
     * This function provides error messages for individual fields or returns all form errors if no specific field is requested.
     * Error messages are wrapped in HTML `<span>` tags with unique IDs to facilitate identification and styling.
     *
     * - If a field name is provided:
     *     - Returns the error message for the specific field as a span element with a unique `id` attribute.
     *     - If no error message is available for the field, returns an empty span element.
     * - If no field name is provided:
     *     - Returns an associative array of all error messages, each wrapped in a span element with a unique `id` attribute.
     *     - If no errors are found, returns an empty array.
     * - If the form has not been validated yet:
     *     - Returns an empty string if a specific field name is provided.
     *     - Returns an empty array if no field name is provided.
     *
     * @param string|null $field The name of the field to retrieve errors for. If null, returns all errors.
     * - Must be a valid string or `null`.
     * - If provided, the resulting span element will have a unique `id` attribute prefixed with "fh-error-".
     * 
     * @param string $class (optional) Additional classes to assign to the error `<span>` element.
     * - Defaults to an empty string.
     * 
     * @return mixed If a field name is provided, returns the error message wrapped in a span or an empty string if no error.
     *               If no field name is provided, returns an associative array of all errors or an empty array if no errors.
     *               If the form has not been validated yet, returns an empty string.
     * 
     * @example
     * Example usage to get a specific field's error message with a custom class:
     * echo $form->getErrors('email', 'form-error');
     * This will generate: "<span class='form-error' id='fh-error-email'>Error message here</span>"
     * 
     * Example usage to get all error messages:
     * print_r($form->getErrors());
     * This will generate an associative array like:
     * [
     *   'email' => "<span class='form-error' id='fh-error-email'>Invalid email</span>",
     *   'username' => "<span class='form-error' id='fh-error-username'>Username too short</span>"
     * ]
     */
    public function getErrors(string $field = null): mixed
    {
        $wrapError = function (string $field, string $message) {
            return "id='fh-error-$field' data-error-message='$message'";
        };

        $field = Validator::validateString($field);
        $state = $this->stateManager->getState(self::FORM_INPUT_ERRORS);

        if ($this->validated && $state) {
            if ($field) {
                $errorState = $state['errors'] ?? [];
                return $wrapError($field, $errorState[$field] ?? '');
            }

            $errors = $state['errors'] ?? [];
            foreach ($errors as $fieldName => $message) {
                $errors[$fieldName] = $wrapError($fieldName, $message);
            }

            return $errors;
        }

        if ($field) {
            $fieldData = $this->data[$field] ?? '';
            return $wrapError($field, $fieldData);
        }

        return [];
    }

    public function clearErrors()
    {
        $this->stateManager->resetState(self::FORM_INPUT_ERRORS, true);
    }

    /**
     * Validates a form field based on the provided rules.
     *
     * @param string $field The name of the field to validate.
     * @param array $rules An associative array of rules to apply. Each key is the rule name, and the value is the rule options.
     * The options can be a scalar value or an array with 'value' and 'message' keys.
     * The 'value' key is the value to compare with, and the 'message' key is the custom error message.
     * 
     * Supported rules:
     * - text, search, email, password, number, date, color, range, tel, url, time, datetime-local, month, week, file
     * - required, min, max, minLength, maxLength, pattern, autocomplete, readonly, disabled, placeholder, autofocus, multiple, accept, size, step, list
     * 
     * Custom error messages can be provided for each rule. If not provided, a default message is used.
     *  
     * @example
     * $form->validateField('email', [
     *   'required' => ['value' => true, 'message' => 'Email is required.'],   
     *   'email' => ['value' => true, 'message' => 'Please enter a valid email address.']
     * ]);
     *
     * @return void
     */
    public function validateField($field, $rules)
    {
        $value = Validator::validateString($this->data[$field] ?? null);
        foreach ($rules as $rule => $options) {
            $ruleValue = $options;
            $customMessage = null;

            if (is_array($options)) {
                $ruleValue = $options['value'];
                $customMessage = $options['message'] ?? null;
            }

            switch ($rule) {
                case 'text':
                case 'search':
                    if (!is_string($value)) $this->addError($field, $customMessage ?? 'Must be a string.');
                    break;
                case 'email':
                    if (!filter_var($value, FILTER_VALIDATE_EMAIL)) $this->addError($field, $customMessage ?? 'Invalid email format.');
                    break;
                case 'number':
                    if (!is_numeric($value)) $this->addError($field, $customMessage ?? 'Must be a number.');
                    break;
                case 'date':
                    if (!\DateTime::createFromFormat('Y-m-d', $value)) $this->addError($field, $customMessage ?? 'Invalid date format.');
                    break;
                case 'range':
                    if (!is_numeric($value) || $value < $ruleValue[0] || $value > $ruleValue[1]) $this->addError($field, $customMessage ?? "Must be between $ruleValue[0] and $ruleValue[1].");
                    break;
                case 'url':
                    if (!filter_var($value, FILTER_VALIDATE_URL)) $this->addError($field, $customMessage ?? 'Invalid URL format.');
                    break;
                case 'datetime-local':
                    if (!\DateTime::createFromFormat('Y-m-d\TH:i', $value)) $this->addError($field, $customMessage ?? 'Invalid datetime-local format.');
                    break;
                case 'file':
                    if (!is_uploaded_file($value)) $this->addError($field, $customMessage ?? 'Invalid file format.');
                    break;
                case 'required':
                    if (empty($value)) $this->addError($field, $customMessage ?? 'This field is required.');
                    break;
                case 'min':
                    if ($value < $ruleValue) $this->addError($field, $customMessage ?? "Must be at least $ruleValue.");
                    break;
                case 'max':
                    if ($value > $ruleValue) $this->addError($field, $customMessage ?? "Must be at most $ruleValue.");
                    break;
                case 'minLength':
                    if (strlen($value) < $ruleValue) $this->addError($field, $customMessage ?? "Must be at least $ruleValue characters.");
                    break;
                case 'maxLength':
                    if (strlen($value) > $ruleValue) $this->addError($field, $customMessage ?? "Must be at most $ruleValue characters.");
                    break;
                case 'pattern':
                    if (!preg_match("/$ruleValue/", $value)) $this->addError($field, $customMessage ?? 'Invalid format.');
                    break;
                case 'accept':
                    if (!in_array($value, explode(',', $ruleValue))) $this->addError($field, $customMessage ?? 'Invalid file format.');
                    break;
                case 'autocomplete':
                    if (!in_array($value, ['on', 'off'])) $this->addError($field, $customMessage ?? 'Invalid autocomplete value.');
                    break;
                default:
                    // Optionally handle unknown rules or log them
                    break;
            }
        }
    }

    /**
     * Registers a form field and its validation rules, and updates the form state.
     *
     * @param string $fieldName The name of the form field.
     * @param array $rules Validation rules for the field.
     * @return string HTML attributes for the field.
     */
    public function register($fieldName, $rules = []): string
    {
        $value = Validator::validateString($this->data[$fieldName] ?? '');

        $isTypeButton = array_key_exists('button', $rules);
        $attributes = "";
        if ($isTypeButton) {
            $attributes = "id='fh-$fieldName' name='$fieldName' data-rules='" . json_encode($rules) . "'";
        } else {
            $attributes = "id='fh-$fieldName' name='$fieldName' value='$value' data-rules='" . json_encode($rules) . "'";
        }

        if (!array_intersect(array_keys($rules), ['text', 'email', 'password', 'number', 'date', 'color', 'range', 'tel', 'url', 'search', 'time', 'datetime-local', 'month', 'week', 'file', 'submit', 'checkbox', 'radio', 'hidden', 'button', 'reset'])) {
            $rules['text'] = ['value' => true];
        }

        foreach ($rules as $rule => $ruleValue) {
            $attributes .= $this->parseRule($rule, $ruleValue);
        }

        $inputField = $this->stateManager->getState(self::FORM_INPUT_REGISTER) ?? [];
        $inputField[$fieldName] = [
            'value' => $value,
            'attributes' => $attributes,
            'rules' => $rules,
        ];
        $this->stateManager->setState([self::FORM_INPUT_REGISTER => $inputField], true);

        return $attributes;
    }

    /**
     * Retrieves the registered form fields.
     * 
     * @return array An associative array of registered form fields.
     * 
     * @example
     * $form->getRegisteredFields();
     * This will return an array of registered form fields.
     */
    public function getRegisteredFields(): array
    {
        return $this->stateManager->getState(self::FORM_INPUT_REGISTER) ?? [];
    }

    private function parseRule($rule, $ruleValue)
    {
        $attribute = '';
        $ruleParam = $ruleValue;
        $requestName = null;
        // $ruleParam = is_array($ruleValue) ? $ruleValue['value'] : $ruleValue;

        if (is_array($ruleValue)) {
            $ruleParam = $ruleValue['value'];
            $requestName = $ruleValue['name'] ?? null;
        }

        switch ($rule) {
            case 'text':
            case 'search':
            case 'email':
            case 'password':
            case 'number':
            case 'date':
            case 'color':
            case 'range':
            case 'tel':
            case 'url':
            case 'time':
            case 'datetime-local':
            case 'month':
            case 'week':
            case 'file':
            case 'submit':
            case "checkbox":
            case "radio":
            case "hidden":
            case "button":
            case "reset":
                $attribute .= " type='$rule'";
                break;
            case 'required':
                $attribute .= " required";
                break;
            case 'min':
            case 'max':
                $attribute .= " $rule='$ruleParam'";
                break;
            case 'minLength':
            case 'maxLength':
                $attribute .= " $rule='$ruleParam'";
                break;
            case 'pattern':
                $attribute .= " pattern='$ruleParam'";
                break;
            case 'autocomplete':
                $attribute .= " autocomplete='$ruleParam'";
                break;
            case 'readonly':
                $attribute .= " readonly";
                break;
            case 'disabled':
                $attribute .= " disabled";
                break;
            case 'placeholder':
                $attribute .= " placeholder='$ruleParam'";
                break;
            case 'autofocus':
                $attribute .= " autofocus";
                break;
            case 'multiple':
                $attribute .= " multiple";
                break;
            case 'accept':
                $attribute .= " accept='$ruleParam'";
                break;
            case 'size':
                $attribute .= " size='$ruleParam'";
                break;
            case 'step':
                $attribute .= " step='$ruleParam'";
                break;
            case 'list':
                $attribute .= " list='$ruleParam'";
                break;
            case 'create':
                $attribute .= " data-url='$ruleParam' data-request-name='$requestName' data-request-type='create' data-type='register'";
                break;
            case 'read':
                $attribute .= " data-url='$ruleParam' data-request-name='$requestName' data-request-type='read' data-type='register'";
                break;
            case 'update':
                $attribute .= " data-url='$ruleParam' data-request-name='$requestName' data-request-type='update' data-type='register'";
                break;
            case 'delete':
                $attribute .= " data-url='$ruleParam' data-request-name='$requestName' data-request-type='delete' data-type='register'";
                break;
            case 'event':
                $attribute .= " data-event='$ruleParam' data-type='register'";
                break;
            case 'debounce':
                $attribute .= " data-debounce='$ruleParam' data-type='register'";
                break;
            case 'templateConnect':
                $attribute .= " data-template-connect='$ruleParam' data-type='register'";
                break;
            default:
                // Optionally handle unknown rules or log them
                break;
        }
        return $attribute;
    }

    /**
     * Creates a watch element for a form field.
     * 
     * This function returns an HTML string for a watch element with a unique `id` attribute,
     * useful for monitoring changes in the value of a form field.
     * 
     * @param string $field The name of the field to create a watch element for.
     * 
     * @return string An HTML string representing the watch element. The element will have a unique `id` attribute prefixed with "fh-watch-" and suffixed by the field name, and it will include `data-watch-value` and `data-type` attributes.
     * 
     * @example
     * Example usage to create a watch element for a "username" field:
     * 
     * echo $form->watch('username');
     * Output: "<div id='fh-watch-username' data-watch-value='{value}' data-type='watch'></div>"
     */
    public function watch(string $field)
    {
        $field = Validator::validateString($field);
        $fieldData = $this->data[$field] ?? '';
        return "id='fh-watch-$field' data-watch-value='$fieldData' data-type='watch'";
    }

    /**
     * Creates a template element for a form field.
     * 
     * This function returns an HTML string for a template element with specified data attributes,
     * useful for creating dynamic content that can be cloned and inserted into the DOM.
     * 
     * @param array $params An associative array of parameters.
     *                      - 'field' (optional): The name of the field to create a template for. If not provided, a generic template is created.
     *                      - 'readOnLoad' (optional): A flag indicating whether the template should include the `data-read-on-load` attribute. Defaults to `true`.
     *                      - 'listen' (optional): A string specifying any event the template should listen to. Defaults to an empty string.
     *                      - 'noCache' (optional): A flag indicating whether the template should include the `data-no-cache` attribute. Defaults to `false`.
     * 
     * @return string An HTML string with data attributes for the template. If a field name is provided, 
     *                it includes the `data-template-field` attribute. Otherwise, it includes the `data-template-general` attribute.
     * 
     * @example
     * Example usage to create a template element for a "user" field:
     * 
     * $params = [
     *     'field' => 'user',
     *     'readOnLoad' => true,
     *     'listen' => 'exampleEvent',
     *     'noCache' => true
     * ];
     * echo $form->template($params);
     * Output: "data-template-field='user' data-read-on-load='1' data-type='template' data-listen='exampleEvent' data-no-cache='1'"
     * 
     * Example usage to create a generic template element:
     * 
     * $params = [
     *     'readOnLoad' => true,
     *     'listen' => 'exampleEvent',
     *     'noCache' => false
     * ];
     * echo $form->template($params);
     * Output: "data-template-general='true' data-read-on-load='1' data-type='template' data-listen='exampleEvent' data-no-cache='0'"
     */
    public function template(array $params = []): string
    {
        $field = isset($params['field']) ? Validator::validateString($params['field']) : null;
        $readOnLoad = isset($params['readOnLoad']) ? Validator::validateBoolean($params['readOnLoad']) : true;
        $listen = isset($params['listen']) ? Validator::validateString($params['listen']) : '';
        $noCache = isset($params['noCache']) ? Validator::validateBoolean($params['noCache']) : false;
        if ($field) {
            $templateData = "data-template-field='$field' data-read-on-load='$readOnLoad' data-type='template' data-listen='$listen' data-no-cache='$noCache'";
        } else {
            $templateData = "data-template-general='true' data-read-on-load='$readOnLoad' data-type='template' data-listen='$listen' data-no-cache='$noCache'";
        }

        return $templateData;
    }

    /**
     * Creates a template placeholder for a form field.
     * 
     * This function returns a `data-template-placeholder` attribute with the field name as the value,
     * 
     * useful for dynamically populating template elements with field data.
     * 
     * @param string $field The name of the field to create a placeholder for.
     * 
     * @return string A `data-template-placeholder` attribute with the field name as the value.
     * 
     * @example
     * Example usage to create a placeholder for a "name" field:
     * echo $form->templatePlaceholder('name');
     * This will generate: "data-template-placeholder='name'"
     */
    public function templatePlaceholder(string $field)
    {
        $field = Validator::validateString($field);
        return "data-template-placeholder='$field' data-type='template-placeholder'";
    }

    /**
     * Generates a string containing data attributes for a button element based on input parameters.
     *
     * This function accepts an associative array where keys are attribute names (without the 'data-' prefix)
     * and values are the attribute values. It will only add an attribute if the associated value is not empty.
     * 
     * @param array $attributes Associative array with the following keys and their corresponding values:
     *                          - 'info': Information for the `data-info` attribute.
     *                          - 'event': Event-handler pairs formatted as a string for the `data-event` attribute.
     *                          - 'formAction': Actions or operations associated with a form for the `data-form` attribute.
     *                          - 'connect': Additional connections related to the button for the `data-connect` attribute.
     *
     * @return string A string containing the concatenated `data-*` attributes, ready for inclusion in an HTML tag.
     *
     * @throws InvalidArgumentException If any value in the array does not pass validation.
     */
    public function event(array $attributes)
    {
        $dataAttributes = [];
        $possibleAttributes = ['info', 'event', 'form', 'connect'];

        foreach ($possibleAttributes as $attr) {
            if (isset($attributes[$attr]) && $attributes[$attr] !== '') {
                $validatedValue = Validator::validateString($attributes[$attr]);
                $dataAttributes[] = "data-$attr='$validatedValue' data-type='event'";
            }
        }

        return implode(' ', $dataAttributes);
    }

    public function templateConnect(string $field)
    {
        $field = Validator::validateString($field);
        return "data-template-connect='$field' data-type='template-connect'";
    }

    public function form(string $field, ...$options)
    {
        $field = Validator::validateString($field);
        $attributes = "id='fh-form-$field' method='post'";
        $optionsAttributes = json_encode($options);
        $attributes .= " data-options='$optionsAttributes' data-type='form'";
        return $attributes;
    }
}

?>

<script>
    class FormHandler {
        constructor() {
            this.errors = [];
            this.requestCache = new Map();
            this.dataRulesElements = document.querySelectorAll('[data-rules]');
            this.dataFormElements = document.querySelectorAll('[data-type="form"]');
            this.init();
        }

        init() {
            this.dataRulesElements.forEach(fieldElement => {
                this.initializeFieldFromDOM(fieldElement);
            });

            this.dataFormElements.forEach(formElement => {
                this.initializeFormFromDOM(formElement);
            });

            this.event();
        }

        initializeFieldFromDOM(fieldElement) {
            if (!fieldElement) {
                // console.error('Element not found for field:', fieldElement);
                return;
            }

            const fieldName = fieldElement.name;
            const dataUrl = fieldElement.getAttribute('data-url');
            const rules = JSON.parse(fieldElement.getAttribute('data-rules') || '{}');
            const event = fieldElement.getAttribute('data-event');

            let debounceTime = fieldElement.getAttribute('data-debounce');
            if (!debounceTime || debounceTime.length < 1) {
                debounceTime = 300;
            }

            const debouncedInputHandler = debounce(async () => {
                if (dataUrl) {
                    if (fieldElement.getAttribute('data-type') === 'register') {
                        if (fieldElement.getAttribute('data-request-type') === 'read') {
                            await this.read(dataUrl, fieldElement).catch(error => {
                                console.error("Read failed for field", fieldName, error);
                            });
                        }
                    }
                }
            }, debounceTime);

            const immediateObserver = (e) => {
                const target = e.target;
                this.watch(target);

                const errors = this.validateField(target, target.value, rules);
                const errorContainer = document.getElementById(`fh-error-${target.name}`);
                if (errorContainer) {
                    errorContainer.textContent = errors.join(', ');
                }
            };

            fieldElement.addEventListener('input', debouncedInputHandler);
            fieldElement.addEventListener('input', immediateObserver);

            if (dataUrl) {
                if (this.isDataTypeExists(fieldElement, 'register')) {
                    if (fieldElement.getAttribute('data-request-type') === 'read') {
                        this.read(dataUrl, fieldElement).catch(error => {
                            console.error("Initial read failed for field", fieldName, error);
                        });
                    }
                }
            }
        }

        initializeFormFromDOM(formElement) {
            if (!formElement) return;

            formElement.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(formElement);
                const formFields = Object.fromEntries(formData.entries());

                const optionsAttribute = formElement.getAttribute('data-options');
                if (!optionsAttribute) {
                    console.error("Missing 'data-options' attribute.");
                    return;
                }

                let formOptions;
                try {
                    formOptions = JSON.parse(optionsAttribute);
                } catch (parseError) {
                    console.error("Failed to parse 'data-options'.", parseError);
                    return;
                }

                const formAction = formElement.dataset.action;
                const url = formOptions[0]?.[formAction];
                const readFieldName = formOptions[0]?.['read'];
                const field = document.getElementById(`fh-${readFieldName.name}`);
                const finishFunctionName = formOptions[0]?.['finishFunction'];

                if (!url) {
                    console.error(`Invalid form action: ${formAction}`);
                    return;
                }

                const handleAction = async (actionFunc, errorMsg) => {
                    try {
                        await actionFunc(url, formFields);
                    } catch (error) {
                        console.error(errorMsg, error);
                    }
                };

                switch (formAction) {
                    case 'create':
                        await handleAction(this.create.bind(this), "Create failed");
                        break;
                    case 'update':
                        await handleAction(this.update.bind(this), "Update failed");
                        break;
                    case 'delete':
                        await handleAction(this.delete.bind(this), "Delete failed");
                        break;
                    default:
                        console.error(`Unknown action: ${formAction}`);
                        break;
                }

                if (field) {
                    try {
                        await this.read(field.dataset.url, field);
                    } catch (error) {
                        console.error("Read failed", error);
                    }
                } else {
                    if (readFieldName) {
                        try {
                            await this.read(readFieldName.url, {
                                name: readFieldName,
                                value: ''
                            });
                        } catch (error) {
                            console.error("Read failed", error);
                        }
                    }
                }

                if (finishFunctionName && typeof window[finishFunctionName] === 'function') {
                    window[finishFunctionName]();
                }
            });
        }

        isDataTypeExists(element, dataType) {
            return this.getDataTypes(element).includes(dataType);
        }

        getDataTypes(element) {
            const dataTypes = element.getAttribute('data-type');
            if (dataTypes) {
                return dataTypes.split(',').map(val => val.trim());
            } else {
                return [];
            }
        }

        updateElementDisplay(displayElement, field) {
            const tagName = field.tagName.toUpperCase();
            if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
                if (displayElement.tagName === 'INPUT' || displayElement.tagName === 'TEXTAREA') {
                    displayElement.value = field.value;
                } else {
                    displayElement.dataset.watchValue = field.value;
                    displayElement.textContent = field.value;
                }
            } else {
                displayElement.textContent = field.textContent;
            }
        }

        watch(field) {
            if (!field) return;

            const watchElement = document.getElementById(`fh-watch-${field.name}`);
            if (watchElement) {
                this.updateElementDisplay(watchElement, field);
            }
        }

        clearErrors() {
            const errorElements = document.querySelectorAll('[id^="fh-error-"]');
            errorElements.forEach(element => {
                element.textContent = '';
            });

            this.errors = [];
        }

        getErrors(field) {
            if (field) {
                return document.getElementById(`fh-error-${field}`).textContent;
            } else {
                return this.errors;
            }
        }

        event() {
            const eventElements = document.querySelectorAll('[data-event]');
            eventElements.forEach(element => {
                const eventAttr = element.getAttribute('data-event');
                if (eventAttr) {
                    const events = eventAttr.split(';');
                    events.forEach(eventFunctionPair => {
                        const [eventType, functionName] = eventFunctionPair.split(',').map(val => val.trim());

                        if (eventType && functionName && typeof window[functionName] === 'function') {
                            element.addEventListener(eventType, window[functionName]);

                            element.addEventListener(eventType, (e) => {
                                const eventForm = element.getAttribute('data-form');
                                if (eventForm) {
                                    const formAttributes = eventForm.split(',');
                                    const formElement = document.getElementById(`fh-form-${formAttributes[0]}`);
                                    const formAction = formAttributes[1];

                                    if (!formElement) return;

                                    if (['create', 'read', 'update', 'delete'].includes(formAction)) {
                                        formElement.dataset.action = formAction;
                                    }

                                    if (formAction === 'create') {
                                        const templateElements = document.querySelectorAll('[data-template-connect]');
                                        templateElements.forEach(templateElement => {
                                            if (templateElement) {
                                                this.updateElementDisplay(templateElement, {
                                                    tagName: templateElement.tagName,
                                                    value: '',
                                                    textContent: ''
                                                });
                                            }
                                        });
                                    }
                                }
                            });
                        } else {
                            console.error(`Invalid event or function: ${eventFunctionPair}`);
                        }
                    });
                }
            });
        }

        getTemplateForField(field) {
            let templates = [];
            const typeTemplate = document.querySelectorAll('[data-type="template"]');

            if (typeTemplate.length > 0) {
                templates = Array.from(typeTemplate).filter(template => {
                    const templateField = template.getAttribute('data-template-field');
                    const generalTemplate = template.getAttribute('data-template-general');
                    const listen = template.getAttribute('data-listen');
                    if (templateField === field.name) {
                        return true;
                    }

                    const templateListener = document.querySelector(`[data-template-field="${listen}"]`);
                    if (templateListener && templateListener.getAttribute('data-listen') !== '') {
                        return true;
                    }

                    if (listen === 'read') {
                        return true;
                    }

                    if (generalTemplate === 'true') {
                        return true;
                    }

                    return false;
                });
            }
            return templates;
        }

        processDataItems(items, template, tbody) {
            items.forEach((item) => {
                const clone = document.importNode(template.content, true);

                Object.keys(item).forEach(key => {
                    const placeholderElement = clone.querySelector(`[data-template-placeholder="${key}"]`);
                    if (placeholderElement) {
                        placeholderElement.textContent = item[key];
                    }
                });

                const dataInfoElements = clone.querySelectorAll('[data-info], [data-event], [data-connect]');
                dataInfoElements.forEach(element => {
                    this.attachEventHandlers(element, item);
                });

                tbody.appendChild(clone);
            });
        }

        attachEventHandlers(element, item) {
            const infoKeys = element.getAttribute('data-info');
            if (infoKeys) {
                if (infoKeys === 'all') {
                    const keys = Object.keys(item);
                    keys.forEach(key => {
                        if (item[key] !== undefined) {
                            element.dataset[key] = item[key];
                        }
                    });
                } else {
                    const keys = infoKeys.split(',').map(key => key.trim());
                    keys.forEach(key => {
                        if (item[key] !== undefined) {
                            element.dataset[key] = item[key];
                        }
                    });
                }
            }

            const eventAttr = element.getAttribute('data-event');
            if (eventAttr) {
                const events = eventAttr.split(';');
                events.forEach(eventFunctionPair => {
                    const [eventType, functionName] = eventFunctionPair.split(',').map(val => val.trim());

                    if (eventType && functionName && typeof window[functionName] === 'function') {
                        element.addEventListener(eventType, window[functionName]);

                        element.addEventListener(eventType, (e) => {
                            this.handleDataConnectAndFormActions(element, item);
                        });
                    } else {
                        console.error(`Invalid event or function: ${eventFunctionPair}`);
                    }
                });
            }
        }

        handleDataConnectAndFormActions(element, item) {
            const eventForm = element.getAttribute('data-form');
            if (eventForm) {
                const formAttributes = eventForm.split(',');
                const formElement = document.getElementById(`fh-form-${formAttributes[0]}`);
                const formAction = formAttributes[1];

                if (!formElement) return;

                if (['create', 'read', 'update', 'delete'].includes(formAction)) {
                    formElement.dataset.action = formAction;
                }
            }

            const templateConnectValues = element.getAttribute('data-connect');
            if (templateConnectValues) {
                const connectValues = templateConnectValues.split(',').map(value => value.trim());
                connectValues.forEach(connectValue => {
                    const templateElements = document.querySelectorAll(`[data-template-connect="${connectValue}"]`);
                    templateElements.forEach(templateElement => {
                        this.updateElementDisplay(templateElement, {
                            tagName: templateElement.tagName,
                            value: item[connectValue],
                            textContent: item[connectValue]
                        });
                    });
                });
            }
        }

        updateTemplates(templates, response, field) {
            const items = Array.isArray(response) ? response : [response];
            templates.forEach(template => {
                let readOnLoad = template.getAttribute('data-read-on-load');
                let noCache = template.getAttribute('data-no-cache');
                if (readOnLoad === '' && (field.value === undefined || field.value.length === 0)) {
                    const tbody = template.parentNode;
                    tbody.innerHTML = '';
                    tbody.appendChild(template);
                    return;
                }

                const tbody = template.parentNode;
                tbody.innerHTML = '';
                tbody.appendChild(template);

                this.processDataItems(items, template, tbody);

                if (noCache !== '') {
                    this.requestCache.delete(cacheKey);
                }
            });
        }

        clearCache() {
            this.requestCache.clear();
        }

        async create(url, data) {
            if (!url || !data) return;

            try {
                const response = await api.post(url, data);
                this.clearCache();
            } catch (error) {
                console.error("Create failed", error);
            }
        }

        async read(url, field) {
            if (!url || !field) return;

            let fieldDataName = '';
            if (field instanceof HTMLElement) {
                const requestName = field.getAttribute('data-request-name');
                fieldDataName = requestName && requestName.length > 0 ? requestName : field.name;
            } else {
                fieldDataName = field.name ?? '';
            }

            if (!fieldDataName) return;

            const data = {
                [fieldDataName]: field.value
            };

            let templates = this.getTemplateForField(field);
            if (templates.length === 0) return;

            const cacheKey = `${url}-${JSON.stringify(data)}`;
            if (this.requestCache.has(cacheKey)) {
                return this.requestCache.get(cacheKey)
                    .then(response => {
                        this.updateTemplates(templates, response, field);
                    })
                    .catch(error => {
                        console.error("🚀 ~ FormHandler ~ read ~ error from cache:", error);
                    });
            }

            const requestPromise = api.post(url, data);
            this.requestCache.set(cacheKey, requestPromise);

            try {
                const response = await requestPromise;
                this.updateTemplates(templates, response, field, cacheKey);
            } catch (error) {
                console.error("🚀 ~ FormHandler ~ read ~ error from request:", error);
                this.requestCache.delete(cacheKey);
            }
        }

        async update(url, data) {
            if (!url || !data) return;

            try {
                const response = await api.put(url, data);
                this.clearCache();
            } catch (error) {
                console.error("Update failed", error);
            }
        }

        async delete(url, data) {
            if (!url || !data) return;

            try {
                const response = await api.delete(url, data);
                this.clearCache();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }

        validateField(field, value, rules) {
            if (!rules) return [];
            this.errors = [];

            for (const [rule, options] of Object.entries(rules)) {
                let ruleValue = options;
                let customMessage = null;

                if (typeof options === 'object') {
                    ruleValue = options.value;
                    customMessage = options.message || null;
                }

                switch (rule) {
                    case 'text':
                    case 'search':
                        if (typeof value !== 'string') {
                            this.errors.push(customMessage || 'Must be a string.');
                        }
                        break;
                    case 'email':
                        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                            this.errors.push(customMessage || 'Invalid email format.');
                        }
                        break;
                    case 'number':
                        if (isNaN(value)) {
                            this.errors.push(customMessage || 'Must be a number.');
                        }
                        break;
                    case 'date':
                        if (isNaN(Date.parse(value))) {
                            this.errors.push(customMessage || 'Invalid date format.');
                        }
                        break;
                    case 'range':
                        const [min, max] = ruleValue;
                        if (isNaN(value) || value < min || value > max) {
                            this.errors.push(customMessage || `Must be between ${min} and ${max}.`);
                        }
                        break;
                    case 'url':
                        try {
                            new URL(value);
                        } catch (e) {
                            this.errors.push(customMessage || 'Invalid URL format.');
                        }
                        break;
                    case 'required':
                        if (!value) {
                            this.errors.push(customMessage || 'This field is required.');
                        }
                        break;
                    case 'min':
                        if (Number(value) < ruleValue) {
                            this.errors.push(customMessage || `Must be at least ${ruleValue}.`);
                        }
                        break;
                    case 'max':
                        if (Number(value) > ruleValue) {
                            this.errors.push(customMessage || `Must be at most ${ruleValue}.`);
                        }
                        break;
                    case 'minLength':
                        if (value.length < ruleValue) {
                            this.errors.push(customMessage || `Must be at least ${ruleValue} characters.`);
                        }
                        break;
                    case 'maxLength':
                        if (value.length > ruleValue) {
                            this.errors.push(customMessage || `Must be at most ${ruleValue} characters.`);
                        }
                        break;
                    case 'pattern':
                        if (!new RegExp(ruleValue).test(value)) {
                            this.errors.push(customMessage || 'Invalid format.');
                        }
                        break;
                    case 'accept':
                        if (!ruleValue.split(',').includes(value)) {
                            this.errors.push(customMessage || 'Invalid file format.');
                        }
                        break;
                    default:
                        // Optionally handle unknown rules or log them
                        break;
                }
            }

            return this.errors;
        }
    }

    let formHandler = null;
    document.addEventListener('DOMContentLoaded', function() {
        formHandler = new FormHandler();
    });
</script>