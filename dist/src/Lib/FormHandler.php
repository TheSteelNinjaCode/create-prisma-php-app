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
     * @param string|null $field The name of the field to get errors for. If null, all errors are returned.
     * @return mixed If a field name is provided, returns the error message for that field or an empty string if no error. 
     *               If no field name is provided, returns an associative array of all errors or an empty array if no errors.
     *               If the form has not been validated yet, returns an empty string.
     */
    public function getErrors(string $field = null): mixed
    {
        $state = $this->stateManager->getState(self::FORM_INPUT_ERRORS);

        if ($this->validated && $state) {
            if ($field) {
                return $state['errors'][$field] ?? '';
            }
            return $state['errors'] ?? [];
        }

        return '';
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
        $attributes = "name=\"$fieldName\" value=\"$value\"";

        if (!array_intersect(array_keys($rules), ['text', 'email', 'password', 'number', 'date', 'color', 'range', 'tel', 'url', 'search', 'time', 'datetime-local', 'month', 'week'])) {
            $rules['text'] = ['value' => true];
        }

        foreach ($rules as $rule => $ruleValue) {
            $attributes .= $this->parseRule($rule, $ruleValue);
        }

        $inputField = $this->stateManager->getState(self::FORM_INPUT_REGISTER) ?? [];
        $inputField[$fieldName] = [
            'value' => $value,
            'attributes' => $attributes,
            'rules' => $rules
        ];
        $this->stateManager->setState([self::FORM_INPUT_REGISTER => $inputField], true);

        return $attributes;
    }

    private function parseRule($rule, $ruleValue)
    {
        $attribute = '';
        $ruleParam = is_array($ruleValue) ? $ruleValue['value'] : $ruleValue;

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
                $attribute .= " type=\"$rule\"";
                break;
            case 'required':
                $attribute .= " required";
                break;
            case 'min':
            case 'max':
                $attribute .= " $rule=\"$ruleParam\"";
                break;
            case 'minLength':
            case 'maxLength':
                $attribute .= " $rule=\"{$ruleParam}\"";
                break;
            case 'pattern':
                $attribute .= " pattern=\"$ruleParam\"";
                break;
            case 'autocomplete':
                $attribute .= " autocomplete=\"$ruleParam\"";
                break;
            case 'readonly':
                $attribute .= " readonly";
                break;
            case 'disabled':
                $attribute .= " disabled";
                break;
            case 'placeholder':
                $attribute .= " placeholder=\"$ruleParam\"";
                break;
            case 'autofocus':
                $attribute .= " autofocus";
                break;
            case 'multiple':
                $attribute .= " multiple";
                break;
            case 'accept':
                $attribute .= " accept=\"$ruleParam\"";
                break;
            case 'size':
                $attribute .= " size=\"$ruleParam\"";
                break;
            case 'step':
                $attribute .= " step=\"$ruleParam\"";
                break;
            case 'list':
                $attribute .= " list=\"$ruleParam\"";
                break;
            default:
                // Optionally handle unknown rules or log them
                break;
        }
        return $attribute;
    }
}
